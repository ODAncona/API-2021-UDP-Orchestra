/*
 * Include standard and third-party npm modules
 */
var net = require('net');
var async = require("async");
var Chance = require('chance');
var expect = require('chai').expect;

/*
 * Include our own utility module
 */
var DockerUtils = require('./docker.js');


var chance = new Chance();


/**
 * This function starts an "auditor" container. It delegates the real work to a generic function
 * provided by our own Docker utility module (which uses the 'dokerode' npm module)
 */
function startAuditor(auditorHasStarted) {
	DockerUtils.startContainer('api/auditor', [], auditorHasStarted);
}

/**
 * This function starts a "musician" container. It delegates the real work to a generic function
 * provided by our own Docker utility module (which uses the 'dokerode' npm module)
 */
function startRandomMusician(musicianHasStarted) {
	var instruments = new Map();
	instruments.set("piano", "ti-ta-ti");
	instruments.set("trumpet", "pouet");
	instruments.set("flute", "trulu");
	instruments.set("violin", "gzi-gzi");
	instruments.set("drum", "boum-boum");
	var instrument = chance.pickone(Array.from(instruments.keys()));
	DockerUtils.startContainer('api/musician', [instrument], musicianHasStarted);
}

/*
 * This function looks for 'audidtor' containers. Assuming it has found one, it gets its IP address
 * and connects to the TCP interface provided by the auditor. It receives an array of instruments.
 */
function askAuditorForActiveInstruments(activeInstrumentsHaveBeenRetrieved) {
	function invokeTcpInterface(auditorContainer, activeMusiciansHaveBeenFetched) {
		//console.log(JSON.stringify(auditorContainer, null, ' '));
		var auditorIPAddress = auditorContainer.NetworkSettings.Networks.bridge.IPAddress;
		var client = new net.Socket();
		var payload = "";
		var PORT = 2205;
		client.connect(PORT, auditorIPAddress, function() {
		});
		client.on('data', function(data) {
			payload = payload + data;
		});
		client.on('end', function() {
			var instruments = JSON.parse(payload);
			client.destroy();
			activeMusiciansHaveBeenFetched(null, instruments);
		});
	};

  /*
   * We use our utility class to find 'auditor' containers. We assume that we will get at least
   * one and we connect to the first one (this code is not robust... we should handle the situation where
   * there is no auditor).
   */
	DockerUtils.lookForAuditorContainers(function(err, auditors) {
		/*
		 * When we reach this statement, we have an array of containers in 'auditors'.
		 * We call the invokeTcpInterface function and pass the first element; we also pass
		 * the callback function that we have received from our client.
		 */
		invokeTcpInterface(auditors[0], activeInstrumentsHaveBeenRetrieved);
	});
}

/*
 * This is the main function, which allows us to check if the 'auditor' gives us correct information
 * when we query the TCP interface. To do that, we do 2 tasks in parallel: 1) we use our Docker utility
 * class to find the list of all active instruments (i.e. we know which 'musician' containers are running)
 * and 2) we connect to the TCP interface of one auditor container. When we have both results, we compare them
 * (after sorting the result arrays).
 */
function compareAuditorStateAgainstRunningContainers( checkDone ) {
	/*
	 * We use the async npm module to execute 2 functions in parallel. When both of these functions
	 * have completed, we get their 2 return values in the 'results' array parameter.
	 */
	async.parallel([
			DockerUtils.lookForMusicianContainers, 
			askAuditorForActiveInstruments
		], function(err, results) {
			var instrumentsSeenInDocker = results[0].sort();
			var instrumentsSeenByAuditor = results[1].map( function( raw ) {
				return raw.instrument;
			});
			instrumentsSeenByAuditor.sort();
			
			/*
			 * We use the chai.js npm module to make an assertion on the 2 results. What is seen in Docker should
			 * be the same as what is seen by the auditor. If that's not true, then we will get an error and the
			 * program will terminate.
			 */
			expect(instrumentsSeenInDocker).to.eql(instrumentsSeenByAuditor);
			console.log("Auditor validation: success: " + JSON.stringify(instrumentsSeenByAuditor));
			checkDone( null, "Auditor validation: success");
	});
}

/*
 * Now that we have all of our functions available, we can start/stop containers and validate the behavior of our system.
 * Firstly, we create an array of functions, where each function starts a container (the 10 first function start a musician
 * container, the last one starts an auditor container). We then pass this array to the async.parallel function, which invokes
 * all functions in parallel. When they have all completed, their return values are available in the 'results' array parameter
 * (in the callback passed to async.parallel).
 */
var startContainerFunctions = [];
for (var i=0; i<10; i++) {
	startContainerFunctions.push(startRandomMusician);
}
startContainerFunctions.push(startAuditor);

async.parallel(startContainerFunctions, function(err, results) {
	console.log(results.length + " containers have been started.");
	results.forEach(function(container) {
		console.log(container.Id + " : " + container.Args);
	});

	/*
	 * We will kill 4 containers
	 */
	var numberOfRemainingTests = 4;
	
	/*
	 * We wait 5 seconds before making the first check. During this check, the auditor should have detected
	 * the 10 musicians.
	 */
	setTimeout(function() {
		
		/*
		 * Check that the auditor has detected all running musicians, then schedule a new test, where we kill a
		 * musician, wait for 8 seconds and check the status.
		 */
		compareAuditorStateAgainstRunningContainers(function(err, result) {
			checkThatAuditorDetectsKilledContainer();			
		});
		
		function checkThatAuditorDetectsKilledContainer() {
			if (numberOfRemainingTests === 0) {
				console.log("We have done all tests.");
				return;
			}
			numberOfRemainingTests--;
			DockerUtils.killRandomMusicianContainer();
			setTimeout(function() {
				compareAuditorStateAgainstRunningContainers( function(err, result) {
					console.log("Scheduling a new test");
					checkThatAuditorDetectsKilledContainer();					
				});
			}, 8000);			
		}
		
		
	}, 5000);
});


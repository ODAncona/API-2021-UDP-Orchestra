var Docker = require('dockerode');
var docker = new Docker();
var Chance = require('chance');

var chance = new Chance();

function killAllContainers() {
	docker.listContainers(function(err, containers) {
		containers.forEach(function( container) {
			if (container.Image === "api/musician" || container.Image === "api/auditor") {
				console.log("Killing " + container.Id + " : " + container.Image);
				var c = docker.getContainer(container.Id);
				c.kill({}, function(err, data){});
			}
		});
	});	
}

function killRandomMusicianContainer() {
	docker.listContainers(function(err, containers) {
		var musicians = containers.filter( function (container ) {
			return container.Image === "api/musician";
		});
		if (musicians.length !== 0) {
			console.log("There are " + musicians.length + " musicians, let's kill one");
			var c = docker.getContainer(chance.pickone(musicians).Id);
			c.kill({}, function(err, data){console.log("killed " + c.id)});			
		} else {
			console.log("There are no musicians to kill.");			
		}
	});		
}

function startContainer( image, command, containerHasStarted ) {
	
	/*
	 * Firstly, we use dockerode to create a new container and pass the image and 
	 * command arguments that we have received from the caller. In the callback function,
	 * we receive the ID assigned to the new container.
	 */
	docker.createContainer({
		Image: image,
		Cmd: command
	}, function(err, container) {
		/*
		 * Now that we have a container, we can start it. We could pass a callback function, but
		 * it would be invoked when the container terminates. That is not really helpful for us in
		 * our use case.
		 */
		console.log("Starting auditor container " + JSON.stringify(container.id));
		container.start( function(err, startData) {
			//checkContainerStatus();
			container.inspect(function(err, containerData) {
				containerHasStarted(null, containerData);				
			});
		});

	})
};

function lookForMusicianContainers( containersHaveBeenFound ) {
	var musicians = [];
	docker.listContainers(function(err, containers) {
		containers.forEach(function( container) {
			if (container.Image === "api/musician") {
				musicians.push(container.Command.split(' ')[2]);
			}
		});
		containersHaveBeenFound( null, musicians.sort());
	});
}

function lookForAuditorContainers( containersHaveBeenFound ) {
	var auditors = [];
	docker.listContainers(function(err, containers) {
		containers.forEach(function( container) {
			//console.log("img: " + container.Image);
			if (container.Image === "api/auditor") {
				auditors.push(container);
			}
		});
		containersHaveBeenFound( null, auditors.sort());
	});
}

function dump() {
	docker.listContainers(function(err, containers) {
		console.log();
		console.log("===== docker containers ================================================");
		containers.forEach(function(containerInfo) {
			//console.log(containerInfo);
			var container = {
				Id: containerInfo.Id,
				IPAddress: containerInfo.IPAddress,
				Name: containerInfo.Names[0],
				Image: containerInfo.Image,
				Command: containerInfo.Command
			}
			console.log(container);
		});
		console.log("========================================================================");
	});
};

var DockerUtils = function(){};
DockerUtils.prototype.startContainer = startContainer;
DockerUtils.prototype.lookForMusicianContainers = lookForMusicianContainers;
DockerUtils.prototype.lookForAuditorContainers = lookForAuditorContainers;
DockerUtils.prototype.killAllContainers = killAllContainers;
DockerUtils.prototype.killRandomMusicianContainer = killRandomMusicianContainer;
DockerUtils.prototype.dump = dump;

module.exports = new DockerUtils();


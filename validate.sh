#!/bin/bash

#
# This is a bit brutal (and will affect your system if you are running other
# containers than those of the lab)
#
echo ""
echo ""
echo "*** Killing all running containers"
echo ""
docker kill $(docker ps -a -q)
docker rm $(docker ps -a -q)

#
# Let's get rid of existing images...
#
echo ""
echo ""
echo "*** Deleting our 3 Docker images, if they exist"
echo ""
docker rmi api/auditor
docker rmi api/musician
docker rmi api/validate-music
	
#
# ... and rebuild them
#
echo ""
echo ""
echo "*** Rebuilding our 3 Docker images"
echo ""
docker build --tag api/musician --file ./docker/image-musician/Dockerfile ./docker/image-musician/
docker build --tag api/auditor --file ./docker/image-auditor/Dockerfile ./docker/image-auditor/
docker build --tag api/validate-music --file ./docker/image-validation/Dockerfile ./docker/image-validation/

#
# We start a single container. The Node.js application executed in this container will use
# a npm package to control Docker. It will start/stop musician and auditor containers and check that
# the auditor works as expected.
#
echo ""
echo ""
echo "*** Starting validation..."
echo ""
git remote -v | tee check.log
docker run --name api_validation -v /var/run/docker.sock:/var/run/docker.sock api/validate-music | tee -a check.log




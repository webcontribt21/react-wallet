VERSION=`git describe --tags` || ls
docker build -t aboveboard-broker-portal .
docker tag aboveboard-broker-portal aboveboard/portals:${GIT_BRANCH:7} && \
docker push aboveboard/portals:${GIT_BRANCH:7}

if [[ $VERSION ]]
then
	docker tag aboveboard-broker-portal aboveboard/portals:${VERSION} && \
	docker push aboveboard/portals:${VERSION}
fi
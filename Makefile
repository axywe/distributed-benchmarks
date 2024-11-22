.PHONY: build docker run clean

IMAGE_NAME = axywewastaken/boela:0.1
CUSTOM_IMAGE_PREFIX = boela-custom
CONTAINER_NAME_PREFIX = boela-docker

build:
	@echo "Building custom image with arguments: $(ARGS)"
	UNIQUE_TAG=$(shell date +%s%N) && \
	docker build --build-arg ARGS="$(ARGS)" -t $(CUSTOM_IMAGE_PREFIX):$$UNIQUE_TAG . && \
	echo "Custom image $(CUSTOM_IMAGE_PREFIX):$$UNIQUE_TAG built."

docker:
	@echo "Running container with arguments: $(ARGS)"
	UNIQUE_TAG=$(shell date +%s%N) && \
	CONTAINER_NAME=$(CONTAINER_NAME_PREFIX)-$$UNIQUE_TAG && \
	docker build --build-arg ARGS="$(ARGS)" -t $(CUSTOM_IMAGE_PREFIX):$$UNIQUE_TAG . && \
	docker run -d --name $$CONTAINER_NAME $(CUSTOM_IMAGE_PREFIX):$$UNIQUE_TAG && \
	echo "Container $$CONTAINER_NAME started."

clean:
	@echo "Stopping and removing all containers with prefix $(CONTAINER_NAME_PREFIX)..."
	docker ps -a --filter "name=$(CONTAINER_NAME_PREFIX)" --format "{{.ID}}" | xargs -r docker rm -f
	@echo "Removing all custom images..."
	docker images $(CUSTOM_IMAGE_PREFIX) --format "{{.ID}}" | xargs -r docker rmi -f

run:
	go run main.go
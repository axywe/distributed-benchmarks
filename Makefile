.PHONY: build docker run clean db-up db-clean frontend

IMAGE_NAME = axywewastaken/boela:0.1
CUSTOM_IMAGE_PREFIX = boela-custom
CONTAINER_NAME_PREFIX = boela-docker
BENCH_DIR = bench
ENV = .env
DB_IMAGE = boela-postgres
DB_CONTAINER = boela-db
DB_DIR = database
HOST_RESULTS_DIR = results
DB_DOCKERFILE = $(DB_DIR)/Dockerfile

docker:
	@echo "Running container with arguments: $(ARGS)"
	UNIQUE_TAG=$(shell date +%s%N) && \
	CONTAINER_NAME=$(CONTAINER_NAME_PREFIX)-$$UNIQUE_TAG && \
	docker build --build-arg ARGS="$(ARGS)" -f $(BENCH_DIR)/Dockerfile -t $(CUSTOM_IMAGE_PREFIX):$$UNIQUE_TAG . && \
	docker run -d --name $$CONTAINER_NAME --label group=boela -v $(shell pwd)/$(HOST_RESULTS_DIR)/$$UNIQUE_TAG:/results $(CUSTOM_IMAGE_PREFIX):$$UNIQUE_TAG && \
	echo "$$CONTAINER_NAME"

db-up: db-clean
	@echo "Starting PostgreSQL database..."
	docker build -t $(DB_IMAGE) -f $(DB_DOCKERFILE) $(DB_DIR)
	docker run --env-file $(ENV) -d --name $(DB_CONTAINER) -p 5432:5432 $(DB_IMAGE)
	@echo "PostgreSQL database started on port 5432."

db-clean:
	@echo "Stopping and removing PostgreSQL database..."
	docker rm -f $(DB_CONTAINER) || true
	docker rmi -f $(DB_IMAGE) || true
	@echo "PostgreSQL database removed."

clean:
	@echo "Stopping and removing all containers with prefix $(CONTAINER_NAME_PREFIX)..."
	docker ps -a --filter "name=$(CONTAINER_NAME_PREFIX)" --format "{{.ID}}" | xargs -r docker rm -f
	@echo "Removing all custom images..."
	docker images $(CUSTOM_IMAGE_PREFIX) --format "{{.ID}}" | xargs -r docker rmi -f

run: db-up
	@echo "Running server..."
	go run backend/cmd/server/main.go

frontend:
	@echo "Running frontend..."
	cd frontend && npm run start

db:
	docker-compose up -d

db-down:
	docker-compose down
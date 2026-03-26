.PHONY: all build clean test lint fmt run-api run-gateway run-provenance run-search run-federation migrate-up migrate-down docker-up docker-down

BINARY_DIR := bin
GO := go
GOFLAGS := -v

# Services
SERVICES := api gateway provenance search federation

all: build

build: $(addprefix build-,$(SERVICES))

build-%:
	$(GO) build $(GOFLAGS) -o $(BINARY_DIR)/$* ./cmd/$*

clean:
	rm -rf $(BINARY_DIR)

test:
	$(GO) test ./... -race -count=1

test-coverage:
	$(GO) test ./... -race -coverprofile=coverage.out -covermode=atomic
	$(GO) tool cover -html=coverage.out -o coverage.html

lint:
	golangci-lint run ./...

fmt:
	gofmt -s -w .
	goimports -w .

vet:
	$(GO) vet ./...

# Run individual services
run-api:
	$(GO) run ./cmd/api

run-gateway:
	$(GO) run ./cmd/gateway

run-provenance:
	$(GO) run ./cmd/provenance

run-search:
	$(GO) run ./cmd/search

run-federation:
	$(GO) run ./cmd/federation

# Database migrations (using golang-migrate)
migrate-up:
	migrate -path migrations -database "$(DATABASE_URL)" up

migrate-down:
	migrate -path migrations -database "$(DATABASE_URL)" down 1

migrate-create:
	migrate create -ext sql -dir migrations -seq $(name)

# Docker
docker-up:
	docker compose -f deployments/docker-compose.yml up -d

docker-down:
	docker compose -f deployments/docker-compose.yml down

docker-build:
	docker compose -f deployments/docker-compose.yml build

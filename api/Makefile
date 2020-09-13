.DEFAULT_GOAL := test

export AWS_DEFAULT_REGION ?= us-east-2
export AWS_PROFILE        ?= default

DOMAIN_NAME   ?= test.dev.superhub.io
REGISTRY      ?= $(subst https://,,$(lastword $(shell aws ecr get-login --region $(AWS_DEFAULT_REGION))))
IMAGE         ?= $(REGISTRY)/agilestacks/$(DOMAIN_NAME)/metrics-service
IMAGE_VERSION ?= $(shell git rev-parse HEAD | colrm 7)
NAMESPACE     ?= automation-hub

TEST_DATABASE_URL    := postgres://hub:hubsecretpass@localhost:5432/hubdb
TEST_DATABASE_SCHEMA := metrics_service
export METRICS_API_SECRET := qwerty

kubectl ?= kubectl --context="$(DOMAIN_NAME)" --namespace="$(NAMESPACE)"

build:
	@docker build -t $(IMAGE):$(IMAGE_VERSION) .
.PHONY: build

ecr-login:
	aws ecr get-login --region $(AWS_DEFAULT_REGION) | sed -e 's/[ +]-e[ +]none[ +]/ /g' | sh -
.PHONY: ecr-login

push:
	docker tag  $(IMAGE):$(IMAGE_VERSION) $(IMAGE):latest
	docker push $(IMAGE):$(IMAGE_VERSION)
	docker push $(IMAGE):latest
.PHONY: push

deploy: build ecr-login push kubernetes output

kubernetes:
	-$(kubectl) create ns $(NAMESPACE)
	$(kubectl) apply -f templates/service.yaml
	$(kubectl) apply -f templates/secret.yaml
	$(kubectl) apply -f templates/deployment.yaml
.PHONY: kubernetes

undeploy:
	-$(kubectl) delete -f templates/deployment.yaml
	-$(kubectl) delete -f templates/secret.yaml
	-$(kubectl) delete -f templates/service.yaml
.PHONY: undeploy

output:
	@echo Outputs:
	@echo image_name=$(IMAGE):$(IMAGE_VERSION)
	@echo
.PHONY: output

install:
	@npm install
.PHONY: install

lint:
	@npm run lint
.PHONY: lint

test:
	@DATABASE_URL=$(TEST_DATABASE_URL) POSTGRESQL_SCHEMA=$(TEST_DATABASE_SCHEMA) npm test
.PHONY: test

skaffold-dev:
	skaffold dev --kube-context $(DOMAIN_NAME) --port-forward --cleanup=false
.PHONY: skaffold-dev

run:
	@DATABASE_URL=$(TEST_DATABASE_URL) POSTGRESQL_SCHEMA=$(TEST_DATABASE_SCHEMA) npm start
.PHONY: run

run-postgresql:
	@docker run -ti --rm  --name postgres \
		-e POSTGRES_PASSWORD=hubsecretpass \
		-e POSTGRES_USER=hub \
		-e POSTGRES_DB=hubdb \
		-p 127.0.0.1:5432:5432 \
		postgres:11
.PHONY: run-postgresql

migrate:
	@DATABASE_URL=$(TEST_DATABASE_URL) npm run migrate -- up
.PHONY: migrate

migrate-down:
	@DATABASE_URL=$(TEST_DATABASE_URL) npm run migrate -- down
.PHONY: migrate

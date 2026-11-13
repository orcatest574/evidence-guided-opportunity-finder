.PHONY: cop claude rules start

cop:
	@set -a; \
	. ./.env; \
	set +a; \
	exec copilot $(ARGS)

claude:
	@set -a; \
	. ./.env; \
	set +a; \
	exec claude $(ARGS)

rules:
	npx firebase-tools deploy --only firestore:rules --project atelier-6f995

start:
	npm start
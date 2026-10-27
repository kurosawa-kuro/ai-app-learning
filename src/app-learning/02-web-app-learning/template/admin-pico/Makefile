SRC_DIR := src

.PHONY: install playwright-install serve e2e e2e-headed e2e-ui codegen

install:
	cd $(SRC_DIR) && npm install

playwright-install:
	cd $(SRC_DIR) && npx playwright install

serve:
	cd $(SRC_DIR) && node scripts/serve-static.mjs

e2e:
	cd $(SRC_DIR) && npm run e2e

e2e-headed:
	cd $(SRC_DIR) && npm run e2e:headed

e2e-ui:
	cd $(SRC_DIR) && npm run e2e:ui

codegen:
	cd $(SRC_DIR) && npm run e2e:codegen

# Values rendered from .slipway/config.yaml. Change them with /slipway:bootstrap, then re-scaffold.
locals {
  project     = "taskflow"
  environment = "dev"
  location    = "westeurope"

  resource_group_name = "rg-taskflow-dev"
  acr_name            = "acrtaskflow"
  key_vault_name      = "kv-taskflow-dev"
  identity_name       = "id-taskflow-dev"
  log_analytics_name  = "log-taskflow-dev"
  cicd_principal_name = "sp-taskflow-github" # created by .slipway/setup-azure.sh

  tags = {
    project     = local.project
    environment = local.environment
    managed_by  = "terraform"
    generator   = "slipway"
  }
}

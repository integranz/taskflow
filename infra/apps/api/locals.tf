# Values rendered from .slipway/config.yaml for app `api`. Change them with /slipway:bootstrap, then re-scaffold.
locals {
  project     = "taskflow"
  environment = "dev"
  app         = "api"

  resource_group_name = "rg-taskflow-dev"
  acr_name            = "acrtaskflow"
  key_vault_name      = "kv-taskflow-dev"
  identity_name       = "id-taskflow-dev"
  cae_name            = "cae-taskflow-dev"

  tags = {
    project     = local.project
    environment = local.environment
    managed_by  = "terraform"
    layer       = "app"
    generator   = "slipway"
  }
}

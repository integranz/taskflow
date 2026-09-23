terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.0"
    }
  }

  # State of this app only (Entra ID auth; the CD identity writes it):
  backend "azurerm" {
    resource_group_name  = "rg-taskflow-tfstate"
    storage_account_name = "sttaskflowtf"
    container_name       = "tfstate"
    key                  = "taskflow/apps/api/dev.tfstate"
    use_azuread_auth     = true
  }
}

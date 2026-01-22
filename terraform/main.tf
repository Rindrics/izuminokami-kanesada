terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.16"
    }
  }

  cloud {
    # Organization: TF_CLOUD_ORGANIZATION
    # Workspace: TF_WORKSPACE
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

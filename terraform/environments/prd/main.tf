terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.16"
    }
  }

  cloud {}
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = {
    project_id  = var.project_id
    environment = var.environment
  }
}

module "tts_service_account" {
  source = "../../modules/tts-service-account"

  project_id  = var.project_id
  environment = var.environment
}

module "audio_storage" {
  source = "../../modules/audio-storage"

  project_id            = var.project_id
  environment           = var.environment
  location              = var.region
  service_account_email = module.tts_service_account.service_account_email

  cors_origins = [
    "https://${var.project_id}.web.app",
    "https://${var.project_id}.firebaseapp.com",
    "https://izuminokami-kanesada.com"
  ]
}

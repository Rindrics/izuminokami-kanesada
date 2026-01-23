# TTS Service Account Module
# Creates a service account with necessary permissions for Text-to-Speech and Storage

resource "google_service_account" "tts" {
  account_id   = "text-to-speech-${var.environment}"
  display_name = "Text-to-Speech ${var.environment}"
  description  = "Text-to-Speech Service Account for ${var.environment} environment"
}

# IAM role bindings for the service account

# Service Usage Consumer (allows calling APIs including Text-to-Speech)
resource "google_project_iam_member" "service_usage_consumer" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = "serviceAccount:${google_service_account.tts.email}"
}

# Storage Object Admin (for Firebase Storage)
resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.tts.email}"
}

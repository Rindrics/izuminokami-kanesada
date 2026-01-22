# TTS Service Account Module
# Creates a service account with necessary permissions for Text-to-Speech and Storage

resource "google_service_account" "tts" {
  account_id   = "tts-service-account-${var.environment}"
  display_name = "TTS Service Account ${var.environment}"
  description  = "Text-to-speech Service Account for ${var.environment} environment"
}

# IAM role bindings for the service account

# Cloud Text-to-Speech API User
resource "google_project_iam_member" "tts_user" {
  project = var.project_id
  role    = "roles/cloudtexttospeech.user"
  member  = "serviceAccount:${google_service_account.tts.email}"
}

# Storage Object Admin (for Firebase Storage)
resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.tts.email}"
}

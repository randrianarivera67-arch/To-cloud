/**
 * Facade historique.
 *
 * Les metadonnees vivent desormais dans Supabase (db.js). Ce fichier ne fait
 * que reexporter, pour que le reste de l'application reste inchange.
 */
export {
  supabase, CONFIGURED, MISSING, WORKER, token, register, login, loginWithGoogle, finishOAuth, resumeOAuth, resetPassword, logout, profile,
  listFiles, counts, listFolders, folderCounts, addFolder, dropFolder, moveFile,
  removeFile, listTrash, trashStats, restoreFile, purgeFile, emptyTrash,
  upload, uploadedParts, download, downloadToDisk, objectUrl, streamUrl, forgetStream,
  shareFile, categorize,
} from "./db.js";

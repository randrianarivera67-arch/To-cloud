/**
 * Facade historique.
 *
 * Les metadonnees vivent desormais dans Supabase (db.js). Ce fichier ne fait
 * que reexporter, pour que le reste de l'application reste inchange.
 */
export {
  supabase, CONFIGURED, MISSING, WORKER, token, register, login, loginWithGoogle, resetPassword, logout, profile,
  listFiles, counts, listFolders, addFolder, dropFolder, moveFile,
  removeFile, listTrash, restoreFile, purgeFile, emptyTrash,
  upload, download, downloadToDisk, objectUrl, shareFile, categorize,
} from "./db.js";

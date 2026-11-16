import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorState, LoadingState } from "../../components/common/AsyncState.jsx";
import { useDataRecovery } from "../../context/DataRecoveryContext.jsx";
import { getBackups, restoreBackup } from "../../services/api/backupsService.js";
import "./DataManagementPage.css";

function formatBackupDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

const STATUS_LABELS = {
  valid: "Disponible para restaurar",
  invalid: "No válida",
  not_validated: "Pendiente de validación",
};

function restoreErrorMessage(error) {
  if (error?.code === "BACKUP_NOT_FOUND") return "La copia seleccionada ya no está disponible. Se ha actualizado el catálogo.";
  if (error?.code === "BACKUP_NOT_RESTORABLE") return "La copia no superó la validación actual y no puede restaurarse. Se ha actualizado el catálogo.";
  if (error?.code === "RESTORE_CONFIRMATION_REQUIRED") return "La solicitud no fue aceptada porque la confirmación no fue válida.";
  if (error?.code === "BACKUP_RESTORE_FAILED") return "No fue posible completar la restauración. Los datos anteriores se conservaron.";
  return error?.message || "No fue posible restaurar la copia seleccionada.";
}

function DataManagementPage() {
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const restoreButtonRef = useRef(null);
  const { refreshError, isRefreshing, restoreSucceeded, retryRefresh, completeRestoration } = useDataRecovery();

  const loadBackups = useCallback(async () => {
    setIsLoading(true);
    setCatalogError(null);
    try {
      setBackups(await getBackups());
    } catch (error) {
      setCatalogError(error);
      setBackups([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  useEffect(() => {
    if (!selectedBackup) return undefined;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isRestoring) setSelectedBackup(null);
        return;
      }
      if (event.key !== "Tab" || isRestoring) return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (!isRestoring) restoreButtonRef.current?.focus();
    };
  }, [selectedBackup, isRestoring]);

  function openConfirmation(backup, event) {
    restoreButtonRef.current = event.currentTarget;
    setNotice("");
    setNoticeIsError(false);
    setSelectedBackup(backup);
  }

  async function confirmRestore() {
    if (!selectedBackup || selectedBackup.validation_status !== "valid" || isRestoring) return;
    setIsRestoring(true);
    setNotice("");
    setNoticeIsError(false);
    try {
      const result = await restoreBackup(selectedBackup.backup_id);
      setSelectedBackup(null);
      setNotice(result.message || "La restauración se completó correctamente.");
      setNoticeIsError(false);
      const refreshed = await completeRestoration();
      if (!refreshed) {
        setNotice("La restauración se completó correctamente, pero la actualización de los datos quedó incompleta. Puedes reintentar la actualización sin repetir la restauración.");
        setNoticeIsError(true);
      }
    } catch (error) {
      setNotice(restoreErrorMessage(error));
      setNoticeIsError(true);
      if (error?.code === "BACKUP_NOT_FOUND" || error?.code === "BACKUP_NOT_RESTORABLE") {
        await loadBackups();
      }
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <section className="data-management-page">
      <header className="data-management-heading">
        <div>
          <p className="page-eyebrow">CONFIGURACIÓN Y SEGURIDAD</p>
          <h1>Gestión de datos</h1>
          <p>Consulta las copias de seguridad semanales y restaura una copia válida cuando sea necesario.</p>
        </div>
      </header>

      {notice && <p className={noticeIsError ? "data-management-notice is-error" : "data-management-notice"} role={noticeIsError ? "alert" : "status"}>{notice}</p>}

      {restoreSucceeded && refreshError && (
        <section className="data-recovery-warning" role="alert" aria-labelledby="recovery-warning-title">
          <h2 id="recovery-warning-title">Actualización pendiente</h2>
          <p>La restauración fue exitosa, pero no se pudieron actualizar todos los datos. No utilices información anterior hasta completar la actualización.</p>
          <button type="button" onClick={retryRefresh} disabled={isRefreshing}>
            {isRefreshing ? "Actualizando datos…" : "Reintentar actualización"}
          </button>
        </section>
      )}

      <section className="data-backups-panel" aria-labelledby="backup-list-title">
        <div className="data-backups-heading">
          <div>
            <h2 id="backup-list-title">Copias de seguridad semanales</h2>
            <p>Se muestran las copias disponibles según el catálogo del sistema.</p>
          </div>
          <span className="data-backup-count">{backups.length} de 15</span>
        </div>

        {isLoading ? (
          <LoadingState message="Consultando copias de seguridad…" />
        ) : catalogError ? (
          <ErrorState message={catalogError.message || "No fue posible consultar las copias de seguridad."} onRetry={loadBackups} />
        ) : backups.length === 0 ? (
          <div className="data-backups-empty" role="status">
            <strong>No hay copias semanales disponibles</strong>
            <p>Cuando el sistema genere una copia de seguridad, aparecerá en este listado.</p>
          </div>
        ) : (
          <div className="data-backups-list">
            {backups.map((backup) => {
              const restorable = backup.validation_status === "valid";
              return (
                <article className="data-backup-card" key={backup.backup_id}>
                  <div className="data-backup-details">
                    <span className="data-backup-date">{formatBackupDate(backup.created_at)}</span>
                    <code>{backup.backup_id}</code>
                    <span className={restorable ? "data-backup-status is-valid" : "data-backup-status"}>
                      {STATUS_LABELS[backup.validation_status] || "Estado no disponible"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={restorable ? "data-restore-button" : "data-restore-button"}
                    disabled={!restorable || isRefreshing}
                    onClick={(event) => openConfirmation(backup, event)}
                  >
                    Restaurar
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedBackup && (
        <div
          className="data-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isRestoring) setSelectedBackup(null);
          }}
        >
          <section
            className="data-restore-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-dialog-title"
            aria-describedby="restore-dialog-description"
            ref={dialogRef}
          >
            <h2 id="restore-dialog-title">Confirmar restauración</h2>
            <p id="restore-dialog-description">
              Vas a reemplazar los datos actuales por los datos de la copia seleccionada. Esta operación no se puede deshacer desde la aplicación.
            </p>
            <dl>
              <div><dt>Fecha de la copia</dt><dd>{formatBackupDate(selectedBackup.created_at)}</dd></div>
              <div><dt>Identificador</dt><dd><code>{selectedBackup.backup_id}</code></dd></div>
            </dl>
            {isRestoring && <p className="data-restore-progress" role="status">Restaurando copia de seguridad. No cierres esta ventana…</p>}
            <div className="data-restore-actions">
              <button ref={cancelButtonRef} type="button" className="data-cancel-button" disabled={isRestoring} onClick={() => setSelectedBackup(null)}>Cancelar</button>
              <button type="button" className="data-confirm-button" disabled={isRestoring} onClick={confirmRestore}>
                {isRestoring ? "Restaurando…" : "Confirmar restauración"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default DataManagementPage;

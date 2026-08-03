namespace BtnCerrarCasos {
    export const OnclickCerrarCasos = async (selectedItems: any, primaryControl: Xrm.FormContext): Promise<void> => {
        try {
            // Mostrar diálogo de confirmación
            const confirmStrings = {
                text: "¿Desea cerrar los casos seleccionados?",
                title: "Cerrar Casos",
                confirmButtonLabel: "Aceptar",
                cancelButtonLabel: "Cancelar",
            };

            const confirmOptions = { height: 250, width: 500 };
            const result = await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions);

            if (!result.confirmed) {
                return; // Si el usuario cancela, salir
            }

            // Pedir la resolución del caso
            const resolucion = window.prompt(
                "Teclea el resolución:\n1 - Solucionado a favor del cliente\n2 - Solucionado como no procede\n3 - Solucionado de forma parcial al cliente"
            );

            if (!resolucion || !["1", "2", "3"].includes(resolucion)) {
                Xrm.Navigation.openAlertDialog({ text: "Debe ingresar una opción válida (1, 2 o 3)." });
                return;
            }

            // Pedir observaciones al usuario
            const observaciones = window.prompt("Ingrese observaciones sobre la resolución del caso:");

            if (!observaciones || observaciones.trim() === "") {
                Xrm.Navigation.openAlertDialog({ text: "Debe ingresar una observación." });
                return;
            }

            // Mostrar el indicador de progreso
            Xrm.Utility.showProgressIndicator("Cerrando casos, por favor espere...");

            try {
                // Llamar a la función para cerrar los casos seleccionados con los valores ingresados
                await createIncidentResolution(selectedItems, resolucion, observaciones);

                // Cerrar el indicador de progreso
                Xrm.Utility.closeProgressIndicator();

                // Mostrar mensaje de éxito
                await Xrm.Navigation.openAlertDialog({
                    text: "Todos los casos han sido cerrados correctamente.",
                });
            } catch (error) {
                console.error("Error al cerrar casos: ", error);
                Xrm.Navigation.openAlertDialog({
                    text: "Ocurrió un error al cerrar los casos. Por favor intente nuevamente.",
                });
            } finally {
                Xrm.Utility.closeProgressIndicator();
            }
        } catch (error) {
            console.error("Error al procesar el cierre de casos: ", error);
            Xrm.Navigation.openAlertDialog({ text: "Error al procesar el cierre de casos." });
        }
    };

    // Función para actualizar la resolución del caso
    const createIncidentResolution = async (selectedItems: string[], resolucion: string, observaciones: string): Promise<void> => {
        for (const caseId of selectedItems) {
            try {
                // Recuperar el valor del campo rs_quedesearealizarinvestigacion
                const response = await Xrm.WebApi.retrieveMultipleRecords("incident", `?$select=rs_quedesearealizarinvestigacion&$filter=incidentid eq ${caseId}`);
    
                if (!response.entities.length) {
                    console.warn(`No se encontró el caso ${caseId}.`);
                    continue;
                }
    
                const decisionValue = response.entities[0].rs_quedesearealizarinvestigacion;
    
                // Determinar el modelo a usar
                let incidentUpdateData: IncidentResolution | IncidentResolutionEscalado;
                if (decisionValue === 1) {
                    incidentUpdateData = {
                        rs_cierremasivoescalado: 1,
                        rs_resolucioncaso: Number(resolucion) || 0,
                        rs_asunto: observaciones,
                    } as IncidentResolutionEscalado;
                } else if (decisionValue === 2 || decisionValue === null) {
                    incidentUpdateData = {
                        rs_finalizarcaso: true,
                        rs_quedesearealizarinvestigacion: 3,
                        rs_resolucioncaso: Number(resolucion) || 0,
                        rs_asunto: observaciones,
                    } as IncidentResolution;
                } else {
                    console.warn(`Caso ${caseId} tiene un valor desconocido en rs_quedesearealizarinvestigacion: ${decisionValue}`);
                    continue;
                }
    
                // Actualizar el caso en Dynamics 365
                await Xrm.WebApi.updateRecord("incident", caseId, incidentUpdateData);
                console.log(`Caso ${caseId} cerrado correctamente.`);

                await enviarNotificacion(caseId);
                console.log(`Plantilla de notificacion de caso ${caseId} enviada correctamente.`);
                
            } catch (error: any) {
                console.error(`Error al cerrar el caso ${caseId}: ${error.message}`);
            }
        }
    };

    const enviarNotificacion = async(casoId : string)=>{
        if(!casoId)return;

        try{
            const envioNotificacionBandera = {
                rs_cerrarcasoorquestador : 1
            };

            await Xrm.WebApi.updateRecord("incident", casoId, envioNotificacionBandera);

        }catch(error: any){
            console.log(`Error al enviar la plantilla de el caso ${casoId}: ${error.message}`);
        }
    }
    // Definición de la interfaz para la actualización del caso
    interface IncidentResolution {
        rs_finalizarcaso: boolean,
        rs_quedesearealizarinvestigacion: number;
        rs_resolucioncaso: number;
        rs_asunto: string;
    }

    interface IncidentResolutionEscalado {
        rs_cierremasivoescalado: number;
        rs_resolucioncaso: number;
        rs_asunto: string;
    }

}

(window as any).BtnCerrarCasos = BtnCerrarCasos;

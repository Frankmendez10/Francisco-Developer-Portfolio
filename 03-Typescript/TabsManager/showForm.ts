namespace formulario {
  export const FORM_IDS = {
    PASIVO_BANCA: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    ACTIVO_BP: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    PROCESO_VENTA: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  };

  /**
   * Obtiene los GUIDs de BPF de forma SÍNCRONA usando XMLHttpRequest
   * @returns Objeto con los GUIDs de BPF
   */
  function obtenerBPFGuidsSync(): any {
    const bpfGuids: any = {
      BG_BPF_Oportunidad: null,
      ProcesoDeVenta: null,
    };

    try {
      const fetchXml = `
                <fetch>
                    <entity name="workflow">
                        <attribute name="workflowid" />
                        <attribute name="name" />
                        <filter type="and">
                            <condition attribute="category" operator="eq" value="4" />
                            <condition attribute="statecode" operator="eq" value="1" />
                            <filter type="or">
                                <condition attribute="name" operator="eq" value="xxxxxxxxxxx" />
                                <condition attribute="name" operator="eq" value="xxxxxxxxxxx" />
                            </filter>
                        </filter>
                    </entity>
                </fetch>`;

      const encodedFetch = encodeURIComponent(fetchXml);
      const url = `${(Xrm.Utility.getGlobalContext() as any).getClientUrl()}/api/data/v9.2/workflows?fetchXml=${encodedFetch}`;

      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, false); // false = síncrono
      xhr.setRequestHeader("OData-MaxVersion", "4.0");
      xhr.setRequestHeader("OData-Version", "4.0");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
      xhr.setRequestHeader("Prefer", 'odata.include-annotations="*"');

      xhr.send();

      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        if (result && result.value) {
          result.value.forEach((workflow: any) => {
            if (workflow.name === "xxxxxxxxxxxx") {
              bpfGuids.BG_BPF_Oportunidad = workflow.workflowid;
            } else if (workflow.name === "yyyyyyyyyyyyyy") {
              bpfGuids.ProcesoDeVenta = workflow.workflowid;
            }            
          });
        }
        console.log("BPF GUIDs recuperados (síncrono):", bpfGuids);
      } else {
        console.error(
          "Error al recuperar BPF GUIDs:",
          xhr.status,
          xhr.statusText,
        );
      }
    } catch (error) {
      console.error("Error en obtenerBPFGuidsSync:", error);
    }

    return bpfGuids;
  }


  /**
   * CF1, CF3, CF4: Activa automáticamente el BPF correcto según el formulario visible
   * VERSIÓN SÍNCRONA - Sin async/await para evitar race conditions
   * @param executionContext Contexto de ejecución de Dynamics 365
   */
  export function ActivarBPFSegunFormulario(
    executionContext: Xrm.Events.EventContext,
  ): void {
    try {
      const formContext = executionContext.getFormContext();

      // CF3: Detectar formulario activo
      const currentFormId = formContext.ui.formSelector
        .getCurrentItem()
        .getId()
        .toLowerCase();
      console.log("Formulario activo:", currentFormId);

      var leadLookup = formContext
        .getAttribute("originatingleadid")
        ?.getValue();

      if (leadLookup && leadLookup.length > 0) {
        ///Significa que la oportunidad viene de un cliente potenial (prospecto), de ser asi debemos remover la asignacion de businessprocessflow
        return;
      }

      // CF2: Obtener GUIDs de BPF de forma síncrona
      const bpfGuids = obtenerBPFGuidsSync();

      // CNF3: Validar que se obtuvieron los BPF
      if (!bpfGuids.BG_BPF_Oportunidad && !bpfGuids.ProcesoDeVenta) {
        console.error("No se encontraron los BPF en la entidad workflow");
        return;
      }

      // CF1: Mapeo Formulario-BPF
      let targetBPFId: string | null = null;
      let targetBPFName = "";

      if (currentFormId === FORM_IDS.ACTIVO_BP.toLowerCase()) {
        targetBPFId = bpfGuids.xxxxxxxxxxx;
        targetBPFName = "xxxxxxxxxxxx";
      } else if (currentFormId === FORM_IDS.PASIVO_BANCA.toLowerCase()) {
        targetBPFId = bpfGuids.yyyyyyyyyyyy;
        targetBPFName = "yyyyyyyyyyy";
      } else if (currentFormId === FORM_IDS.PROCESO_VENTA.toLowerCase()) {
        targetBPFId = bpfGuids.zzzzzzzzzzzzz;
        targetBPFName = "zzzzzzzzzzz";
      } else {
        console.warn(
          "Formulario no reconocido para activación de BPF:",
          currentFormId,
        );
        return;
      }

      // CNF3: Validar que el BPF objetivo existe
      if (!targetBPFId) {
        console.error(`BPF ${targetBPFName} no encontrado en workflow`);
        return;
      }

      // CF4: Activar el BPF si no está ya activo
      const entityId = formContext.data.entity.getId();

      // Validar si es un registro nuevo (no tiene ID aún)
      if (!entityId) {
        /*formContext.data.entity.attributes.forEach((attr) => {
          try {
            attr.setValue(null);
            attr.setSubmitMode("never");
          } catch {}
        });*/

        console.log("Registro nuevo detectado. Configurando BPF para asignación al guardar...",);

        try {
          const activeBPF = formContext.data.process.getActiveProcess();
          if (
            activeBPF &&
            activeBPF.getId().toLowerCase() === targetBPFId.toLowerCase()
          ) {
            console.log(
              `BPF ${targetBPFName} ya está configurado para el nuevo registro`,
            );
            return;
          }

          formContext.data.process.setActiveProcess(
            targetBPFId,
            (result: string) => {
              if (result === "success") {
                console.log(
                  `BPF ${targetBPFName} configurado exitosamente para nuevo registro`,
                );
              } else {
                console.warn(
                  `No se pudo configurar BPF ${targetBPFName}:`,
                  result,
                );
              }
            },
          );
        } catch (error) {
          console.warn(`Error al configurar BPF para registro nuevo:`, error);
        }
        return;
      }

      // Para registros existentes, verificar si ya está activo (síncrono)
      try {
        const activeBPF = formContext.data.process.getActiveProcess();
        if (
          activeBPF &&
          activeBPF.getId().toLowerCase() === targetBPFId.toLowerCase()
        ) {
          console.log(`BPF ${targetBPFName} ya está activo`);
          return;
        }
      } catch (error) {
        console.warn("No se pudo verificar BPF activo:", error);
      }

      // Activar el BPF (síncrono con callback)
      console.log(`Activando BPF ${targetBPFName}...`);
      formContext.data.process.setActiveProcess(
        targetBPFId,
        (result: string) => {
          if (result === "success") {
            console.log(`BPF ${targetBPFName} activado exitosamente`);
            // Refrescar el formulario
            if (
              formContext &&
              formContext.data
              //&& formContext.data.refresh
            ) {
              //  formContext.data.refresh(false);
            }
          } else {
            console.warn(
              `setActiveProcess result: ${result}. El BPF se configurará automáticamente.`,
            );
          }
        },
      );
    } catch (error: any) {
      console.error("Error en ActivarBPFSegunFormulario:", error);
      console.warn(
        "El BPF se configurará automáticamente en el próximo guardado",
      );
    }
  }

  export async function mostrarFormulario(executionContext: Xrm.Events.EventContext,): Promise<void> {
    const formContext = executionContext.getFormContext();
    const rs_masa = formContext.getAttribute("xxxx");

    if (rs_masa) {
      const valor = rs_masa.getValue();

      if (!valor) return;

      try {
        const esPasivo = valor[0].name === "XXXXX";
        const destinoId = esPasivo ? FORM_IDS.PASIVO_BANCA : FORM_IDS.ACTIVO_BP;

        cambiarFormulario(formContext, destinoId);
      } catch (e) {
        console.error("Error al abrir el formulario: ");
      }
    }
  }

  function cambiarFormulario(formContext: Xrm.FormContext,targetFormId: string,): void {
    const currentFormId = formContext.ui.formSelector.getCurrentItem().getId();

    if (currentFormId.toLowerCase() === targetFormId.toLowerCase()) {
      console.log("Ya estás en el formulario destino.");
      return;
    }

    const forms = formContext.ui.formSelector.items.get();
    const targetForm = forms.find(
      (f) => f.getId().toLowerCase() === targetFormId.toLowerCase(),
    );

    if (targetForm) {
      console.log("Cambiando al formulario mediante navigate()");
      targetForm.navigate();
    } else {
      console.error("No se encontró el formulario con el ID:", targetFormId);
    }
  }

  export async function mostrarFormularios(executionContext: Xrm.Events.EventContext): Promise<void> {
    const formContext = executionContext.getFormContext();

    const masa = formContext.getAttribute("xxxx")?.getValue();
    const cliente = formContext.getAttribute("yyyy")?.getValue();
    const lead = formContext.getAttribute("zzzz")?.getValue();
    const validacionIdentidad = formContext.getAttribute("xaxa")?.getValue();

    if (!masa) return;

    const masaId = masa[0].id.replace(/[{}]/g, "");
    const masaName = masa[0].name ?? "";

    //PREPARAR CAMPOS DE CLIENTE O CLIENTE POTENCIAL
    let dataParams: { [key: string]: any } = {
      rs_masaid: masaId,
      rs_masaidname: masaName,
      rs_masaidtype: "mpppppp",
    };

    if (masaName === "XXXX" && cliente && cliente.length > 0) {
      const entityType = cliente[0].entityType;

      if (entityType === "YYYY") {
        await Xrm.Navigation.openAlertDialog({
          text: "El proceso no aplica para Personas Jurídicas.",
          confirmButtonLabel: "Aceptar",
        });
        formContext.getAttribute("xxxx")?.setValue(null);
        return;
      }
    }

    if (cliente && cliente.length > 0) {
      //CLIENTE
      dataParams["clientxid"] = cliente[0].id.replace(/[{}]/g, "");
      dataParams["clientxidname"] = cliente[0].name ?? "";
      dataParams["clientxidtype"] = cliente[0].entityType;
    } else if (lead && lead.length > 0) {
      //CLIENTE POTENCIAL
      dataParams["clientyid"] = lead[0].id.replace(/[{}]/g, "");
      dataParams["clientyid"] = lead[0].name ?? "";
      dataParams["clientyid"] = lead[0].entityType;
    } else {
      console.warn("No hay ni cliente ni cliente potencial");
      return;
    }

    if (validacionIdentidad) {
      dataParams["booleanValue"] = validacionIdentidad;
    }

    // Determinar formulario destino
    const targetFormId =
      masaName === "YYYY" ? FORM_IDS.PASIVO_BANCA : FORM_IDS.ACTIVO_BP;

    if (!targetFormId) {
      console.error("No se encontró formulario destino.");
      return;
    }

    const currentForm = formContext.ui.formSelector.getCurrentItem();
    const currentFormId = currentForm?.getId();

    if (currentFormId?.toLowerCase() === targetFormId.toLowerCase()) {
      console.log("Ya estoy en el formulario destino, no se hace navigateTo.");
      return;
    }    

    //LIMPIADO COMPLETO del formulario antes de navegar
    formContext.data.entity.attributes.forEach((attr) => {
      try {
        attr.setValue(null);
        attr.setSubmitMode("never");
      } catch {}
    });

    const entityId = formContext.data.entity.getId().replace(/[{}]/g, "");

    if(entityId){
      Xrm.Navigation.navigateTo({
        pageType: "entityrecord",
        entityName: "opportunity",
        entityId: entityId,
        formId: targetFormId,
        data: dataParams,
      }, { target: 1 });
    }

    else{
      Xrm.Navigation.navigateTo(
      {
        pageType: "entityrecord",
        entityName: "opportunity",
        formId: targetFormId,
        data: dataParams,       
      },
      { target: 1 },
    );
    }    
  }

  export function filtrarSoloContactos(executionContext: Xrm.Events.EventContext,): void {
    const formContext = executionContext.getFormContext();
    const currentForm = formContext.ui.formSelector.getCurrentItem().getLabel();
    const clienteLookup = formContext.getControl("rs_clienteid") as any;

    if (currentForm !== "XXXX") {
      return;
    }
    if (!clienteLookup) return;

    clienteLookup.setEntityTypes(["contact"]);
    clienteLookup.addPreSearch(() => {
      const filtro = `
                <filter type="and">
                    <condition attribute="contactid" operator="not-null" />
                </filter>`;

      clienteLookup.addCustomFilter(filtro, "contact");
    });
  }

  export async function validarClientePotencialPJ(executionContext: Xrm.Events.EventContext,): Promise<void> {
    const formContext = executionContext.getFormContext();

    const lead = formContext.getAttribute("originatingleadid")?.getValue();
    if (!lead) return;

    const leadId = lead[0].id.replace(/[{}]/g, "");

    const leadData = await Xrm.WebApi.retrieveRecord(
      "lead",
      leadId,
      "?$select=idFake",
    );

    const fechaCreacion = formContext.getAttribute("aaaa")?.getValue();
    const tipoPersona = leadData?.idFake;

    if (fechaCreacion && tipoPersona === 3) {
      await Xrm.Navigation.openAlertDialog({
        text: "No se realiza el proceso de banca persona porque es persona Jurídica",
      });

      let dataParams: { [key: string]: any } = {};
      dataParams["clientyid"] = lead[0].id.replace(/[{}]/g, "");
      dataParams["clientyidname"] = lead[0].name ?? "";
      dataParams["clientyidtype"] = lead[0].entityType;
      dataParams["intValue"] = 1;

      // Usar GUID del formulario Oportunidad
      const formId = FORM_IDS.PASIVO_BANCA;

      // Limpiar formulario
      formContext.data.entity.attributes.forEach((attr) => {
        try {
          attr.setValue(null);
          attr.setSubmitMode("never");
        } catch {}
      });

      await Xrm.Navigation.navigateTo(
        {
          pageType: "entityrecord",
          entityName: "opportunity",
          formId: formId,
          data: dataParams,
        },
        { target: 1 },
      );
    }
  }
}

(window as any).formulario = formulario;

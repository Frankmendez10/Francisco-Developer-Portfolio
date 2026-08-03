namespace reactivarCasos {

  const normalizeGuid = (id: string) => (id || "").replace(/[{}]/g, "").toLowerCase();

  const formatDateYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getErrorMessage = (err: any): string => {
    if (!err) return "Error desconocido.";
    if (typeof err === "string") return err;
    return err.message || err.Message || err.error?.message || "Error desconocido.";
  };

  // Campos que NO se deben clonar
  const EXCLUDE_FIELDS = new Set<string>([
    "incidentid",
    "ticketnumber",
    "createdon",
    "createdby",
    "modifiedon",
    "modifiedby",
    "statecode",
    "statuscode",
    "versionnumber",
    "importsequencenumber",
    "overriddencreatedon",
    "utcconversiontimezonecode",
    "timezoneruleversionnumber",
  ]);

  const entitySetCache: Record<string, string> = {};
  const navPropMapCache: Record<string, Record<string, string>> = {};

  const getApiVersion = (): string => {
    const v = Xrm.Utility.getGlobalContext().getVersion?.() || "9.2";
    const parts = v.split(".");
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : "9.2";
  };

  const fetchJson = async (url: string): Promise<any> => {
    const res = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}. ${txt}`);
    }
    return res.json();
  };

  const getEntitySetName = async (logicalName: string): Promise<string> => {
    if (!logicalName) throw new Error("Entity logical name vacío.");

    const ln = logicalName.toLowerCase();
    if (entitySetCache[ln]) return entitySetCache[ln];

    const clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();
    const apiVersion = getApiVersion();

    const url =
      `${clientUrl}/api/data/v${apiVersion}` +
      `/EntityDefinitions(LogicalName='${encodeURIComponent(ln)}')?$select=EntitySetName`;

    const json = await fetchJson(url);

    const setName = json?.EntitySetName;
    if (!setName) throw new Error(`Metadata sin EntitySetName para ${ln}.`);

    entitySetCache[ln] = setName;
    return setName;
  };

  const loadNavPropertyMapForEntity = async (entityLogicalName: string): Promise<Record<string, string>> => {
    const en = entityLogicalName.toLowerCase();
    if (navPropMapCache[en]) return navPropMapCache[en];

    const clientUrl = Xrm.Utility.getGlobalContext().getClientUrl();
    const apiVersion = getApiVersion();

    const url =
      `${clientUrl}/api/data/v${apiVersion}` +
      `/EntityDefinitions(LogicalName='${encodeURIComponent(en)}')/ManyToOneRelationships` +
      `?$select=ReferencingAttribute,ReferencingEntityNavigationPropertyName`;

    const json = await fetchJson(url);

    const map: Record<string, string> = {};
    const rows: any[] = json?.value || [];

    for (const r of rows) {
      const attr = (r?.ReferencingAttribute || "").toLowerCase();
      const nav = r?.ReferencingEntityNavigationPropertyName;
      if (attr && nav) map[attr] = nav;
    }

    navPropMapCache[en] = map;
    return map;
  };

  const getNavigationPropertyName = async (entityLogicalName: string, attributeLogicalName: string): Promise<string> => {
    const en = entityLogicalName.toLowerCase();
    const attr = (attributeLogicalName || "").toLowerCase();
    if (!attr) return attributeLogicalName;

    const map = await loadNavPropertyMapForEntity(en);
    return map[attr] || attributeLogicalName; // fallback si no existe
  };

  // Payload builder
  const buildClonePayloadFromForm = async (formContext: Xrm.FormContext): Promise<any> => {
    const payload: any = {};
    const attrs = formContext.data.entity.attributes.get();

    for (const attr of attrs) {
      const name = attr.getName();
      if (!name) continue;
      if (EXCLUDE_FIELDS.has(name)) continue;

      const value: any = attr.getValue();
      if (value === null || value === undefined) continue;

      const type = (attr as any).getAttributeType?.() as string;

      switch (type) {
        case "lookup":
        case "customer":
        case "owner": {
          // customerid y ownerid los tratamos afuera (polimórficos)
          if (name === "customerid" || name === "ownerid") break;

          const lv = Array.isArray(value) ? value[0] : null;
          if (!lv?.id || !lv?.entityType) break;

          const entitySet = await getEntitySetName(lv.entityType);
          
          const navPropName = await getNavigationPropertyName("incident", name);

          payload[`${navPropName}@odata.bind`] = `/${entitySet}(${normalizeGuid(lv.id)})`;
          break;
        }

        case "datetime": {
        const raw = value;

        // A veces puede venir Date o string (según contexto/control)
        const d = raw instanceof Date ? raw : new Date(raw);
        if (isNaN(d.getTime())) break;

        const format = (attr as any).getFormat?.(); // "date" | "datetime"

        if (format === "date") {
            // DateOnly: crear fecha LOCAL (00:00 local) y mandar ISO
            // Esto evita shift
            const fechaLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            payload[name] = fechaLocal.toISOString();
        } else {
            // DateTime: ISO normal
            payload[name] = d.toISOString();
        }
        break;
        }

        case "multiselectoptionset": {
          if (Array.isArray(value) && value.length > 0) payload[name] = value;
          break;
        }

        default:
          payload[name] = value;
          break;
      }
    }

    return payload;
  };

  // customerid (polimórfico)
  const applyCustomerBind = (payload: any, casoData: any) => {
    if (!casoData?._customerid_value) return false;

    const customerId = normalizeGuid(casoData._customerid_value);
    const customerType = casoData["_customerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

    if (customerType === "account") {
      payload["customerid_account@odata.bind"] = `/accounts(${customerId})`;
      return true;
    }

    if (customerType === "contact") {
      payload["customerid_contact@odata.bind"] = `/contacts(${customerId})`;
      return true;
    }

    return false;
  };

  // ownerid (team/systemuser)
  const applyOwnerBind = (payload: any, casoData: any) => {
    if (!casoData?._ownerid_value) return;

    const ownerId = normalizeGuid(casoData._ownerid_value);
    const ownerType = casoData["_ownerid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];

    if (ownerType === "systemuser") payload["ownerid@odata.bind"] = `/systemusers(${ownerId})`;
    else if (ownerType === "team") payload["ownerid@odata.bind"] = `/teams(${ownerId})`;
  };

  // CLONADO DE DETALLES rs_detallemovimientos
  const DETALLE_ENTITY = "rs_detallemovimientos";
  const DETALLE_LOOKUP_CASO = "rs_caso";

  const EXCLUDE_DETALLE_FIELDS = new Set<string>([
    "createdon",
    "createdby",
    "modifiedon",
    "modifiedby",
    "ownerid",
    "owningbusinessunit",
    "owninguser",
    "owningteam",
    "statecode",
    "statuscode",
    "versionnumber",
    "importsequencenumber",
    "overriddencreatedon",
    "utcconversiontimezonecode",
    "timezoneruleversionnumber",
  ]);

  const retrieveDetalleMovimientosByCaso = async (casoId: string): Promise<any[]> => {
    const fetchXml = `
      <fetch>
        <entity name='${DETALLE_ENTITY}'>
          <all-attributes />
          <filter type='and'>
            <condition attribute='${DETALLE_LOOKUP_CASO}' operator='eq' value='${casoId}' />
          </filter>
        </entity>
      </fetch>
    `;

    const result = await Xrm.WebApi.retrieveMultipleRecords(
      DETALLE_ENTITY,
      `?fetchXml=${encodeURIComponent(fetchXml)}`
    );

    return result.entities || [];
  };

  const buildClonePayloadFromRetrievedEntity = async (
    entityLogicalName: string,
    entity: any
  ): Promise<any> => {
    const payload: any = {};

    for (const key of Object.keys(entity)) {
      // Ignorar metadatos y anotaciones
      if (!key || key.startsWith("@") || key.includes("@")) continue;

      // Ignorar PK y system fields que no deben setearse
      const keyLower = key.toLowerCase();
      if (EXCLUDE_DETALLE_FIELDS.has(keyLower)) continue;

      const val = entity[key];
      if (val === null || val === undefined) continue;

      // Lookups vienen como _xxxxx_value
      if (keyLower.startsWith("_") && keyLower.endsWith("_value")) {
        const id = String(val || "");
        if (!id) continue;

        // attributeLogicalName: _rs_caso_value -> rs_caso
        const attributeLogicalName = keyLower.substring(1, keyLower.length - "_value".length);

        // no copiar el caso original; lo forzamos después al nuevo caso
        if (attributeLogicalName === DETALLE_LOOKUP_CASO.toLowerCase()) continue;

        const targetLogical =
          entity[`${key}@Microsoft.Dynamics.CRM.lookuplogicalname`] ||
          entity[`${keyLower}@microsoft.dynamics.crm.lookuplogicalname`];

        if (!targetLogical) continue;

        // Polimórfico
        if (attributeLogicalName === "customerid" && (targetLogical === "account" || targetLogical === "contact")) {
          const entitySet = await getEntitySetName(targetLogical);
          payload[`customerid_${targetLogical}@odata.bind`] = `/${entitySet}(${normalizeGuid(id)})`;
          continue;
        }

        const entitySet = await getEntitySetName(targetLogical);
        const navPropName = await getNavigationPropertyName(entityLogicalName, attributeLogicalName);

        payload[`${navPropName}@odata.bind`] = `/${entitySet}(${normalizeGuid(id)})`;
        continue;
      }

      payload[key] = val;
    }

    return payload;
  };

  const cloneDetalleMovimientosToNuevoCaso = async (casoIdOriginal: string, casoIdNuevo: string): Promise<number> => {
    const detalles = await retrieveDetalleMovimientosByCaso(casoIdOriginal);
    if (!detalles.length) return 0;

    // Pre-resolver nav prop del lookup a caso para setearlo bien
    const navPropCaso = await getNavigationPropertyName(DETALLE_ENTITY, DETALLE_LOOKUP_CASO);
    const incidentSet = await getEntitySetName("incident"); // "incidents"

    let creados = 0;

    for (let i = 0; i < detalles.length; i++) {
      //Xrm.Utility.showProgressIndicator(`Clonando detalles (${i + 1}/${detalles.length})...`);

      const entity = detalles[i];
      const payload = await buildClonePayloadFromRetrievedEntity(DETALLE_ENTITY, entity);

      // Forzar relación al NUEVO caso
      payload[`${navPropCaso}@odata.bind`] = `/${incidentSet}(${casoIdNuevo})`;

      // Crear detalle nuevo
      await Xrm.WebApi.createRecord(DETALLE_ENTITY, payload);
      creados++;
    }

    return creados;
  };

  //Reglas de viibilidad del campo
  export const enableButtonCasos = async (primaryControl: Xrm.FormContext): Promise<boolean> => {
    const formContext = primaryControl;

    const estado = formContext.getAttribute("rs_resolucioncaso")?.getValue();
    const bandera = formContext.getAttribute("rs_inconformidad")?.getValue();
    const bandera2 = formContext.getAttribute("rs_casoclonado")?.getValue();

    return estado === 2 && bandera !== 1 && bandera2 !== 1;
  };

  // Acción principal
  export const reactivarCasos = async (primaryControl: Xrm.FormContext): Promise<void> => {
    const formContext = primaryControl;

    const casoId = normalizeGuid(formContext.data.entity.getId());
    if (!casoId) return;

    const confirmStrings = {
      text: "¿Desea reactivar este caso?",
      title: "Reactivar Caso",
      confirmButtonLabel: "Sí",
      cancelButtonLabel: "No",
    };

    const confirmOptions = { height: 200, width: 450 };
    const result = await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions);
    if (!result.confirmed) return;

    const descripcion = window.prompt("Ingrese la descripción para el nuevo caso:");
    if (!descripcion || descripcion.trim() === "") {
      await Xrm.Navigation.openAlertDialog({ text: "Debe ingresar una descripción." });
      return;
    }

    try {
      Xrm.Utility.showProgressIndicator("Creando caso reactivado...");

      const baseUrl = Xrm.Utility.getGlobalContext().getClientUrl();
      const registroOriginalUrl = `${baseUrl}/main.aspx?etn=incident&id=${casoId}&pagetype=entityrecord`;

      const casoData = await Xrm.WebApi.retrieveRecord(
        "incident",
        casoId,
        "?$select=_ownerid_value,_customerid_value,ticketnumber"
      );

      // Marca el original como clonado (sin depender del campo en el form)
      await Xrm.WebApi.updateRecord("incident", casoId, { rs_casoclonado: 1 });

      // Payload dinámico
      const nuevoCaso: any = await buildClonePayloadFromForm(formContext);

      // Overrides
      nuevoCaso["rs_casoreactivado@odata.bind"] = `/incidents(${casoId})`;
      nuevoCaso["rs_razoninconformidad"] = descripcion.trim();
      nuevoCaso["rs_inconformidad"] = 1;
      nuevoCaso["rs_provienevista"] = true;

      // nuevoCaso["rs_urlcasooriginal"] = registroOriginalUrl;

      // Customer obligatorio
      const okCustomer = applyCustomerBind(nuevoCaso, casoData);
      if (!okCustomer) {
        await Xrm.Navigation.openAlertDialog({
          text: "El caso debe tener un cliente (contacto o cuenta) asignado.",
        });
        return;
      }

      // Owner
      applyOwnerBind(nuevoCaso, casoData);

      // Crear caso y detalles de movimiento
      const nuevoCasoCreado = await Xrm.WebApi.createRecord("incident", nuevoCaso);
      const nuevoCasoId = normalizeGuid(nuevoCasoCreado.id);
      const totalDetalles = await cloneDetalleMovimientosToNuevoCaso(casoId, nuevoCasoId);

      // Abrir
      await Xrm.Navigation.openForm({
        entityName: "incident",
        entityId: nuevoCasoCreado.id,
      });

      await Xrm.Navigation.openAlertDialog({ text: "El nuevo caso ha sido creado con éxito." });
    } catch (error) {
      await Xrm.Navigation.openAlertDialog({
        text: "Ocurrió un error al crear el caso: " + getErrorMessage(error),
      });
      console.log(error);
    } finally {
      try {
        Xrm.Utility.closeProgressIndicator();
      } catch {}
    }
  };
}

(window as any).reactivarCasos = reactivarCasos;

using Microsoft.Xrm.Sdk;
using System;

namespace Plugins.CrearExpediente.Services
{
    public class ExpedienteService
    {
        private readonly IOrganizationService _service;
        private readonly ITracingService _tracing;

        public ExpedienteService(IOrganizationService service, ITracingService tracing)
        {
            _service = service;
            _tracing = tracing;
        }

        public void ProcesarExpediente(Entity opportunity)
        {
            if (!opportunity.Contains("customerid"))
                throw new Exception("Customer not found");

            var request = Mappers.ExpedienteMapper.Map(opportunity);

            var api = new Clients.ApiClient(_tracing);
            var response = api.Enviar(request);

            if (!response.Success)
                throw new Exception(response.Message);

            var update = new Entity("opportunity", opportunity.Id);
            update["new_numeroexpediente"] = response.NumeroExpediente;

            _service.Update(update);
        }
    }
}

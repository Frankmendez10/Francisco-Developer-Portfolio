using Microsoft.Xrm.Sdk;
using Plugins.CrearExpediente.Models;

namespace Plugins.CrearExpediente.Mappers
{
    public static class ExpedienteMapper
    {
        public static ExpedienteRequest Map(Entity opportunity)
        {
            return new ExpedienteRequest
            {
                NombreCliente = opportunity.GetAttributeValue<string>("name"),
                Monto = opportunity.GetAttributeValue<Money>("estimatedvalue")?.Value ?? 0
            };
        }
    }
}

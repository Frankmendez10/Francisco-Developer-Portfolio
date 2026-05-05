using Microsoft.Xrm.Sdk;
using System;

namespace CustomAPIs.ActualizarSeguimiento
{
    public class ActualizarSeguimiento : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var service = serviceFactory.CreateOrganizationService(context.UserId);

            var request = new Models.Request
            {
                IdSeguimiento = context.InputParameters["rs_idseguimiento"]?.ToString(),
                NumeroCaso = context.InputParameters["rs_numerodecaso"]?.ToString()
            };

            var seguimientoService = new Services.SeguimientoService(service);
            var response = seguimientoService.Procesar(request);

            context.OutputParameters["response"] = Newtonsoft.Json.JsonConvert.SerializeObject(response);
        }
    }
}

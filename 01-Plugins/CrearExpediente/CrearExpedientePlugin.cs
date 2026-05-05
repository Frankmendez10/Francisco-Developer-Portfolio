using Microsoft.Xrm.Sdk;
using System;

namespace Plugins.CrearExpediente
{
    public class CrearExpedientePlugin : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var tracing = (ITracingService)serviceProvider.GetService(typeof(ITracingService));
            var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var service = serviceFactory.CreateOrganizationService(context.UserId);

            try
            {
                if (!(context.InputParameters["Target"] is Entity entity)) return;
                if (entity.LogicalName != "opportunity") return;

                var serviceExp = new Services.ExpedienteService(service, tracing);
                serviceExp.ProcesarExpediente(entity);
            }
            catch (Exception ex)
            {
                tracing.Trace(ex.ToString());
                throw;
            }
        }
    }
}

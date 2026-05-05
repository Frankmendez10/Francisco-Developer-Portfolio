using Microsoft.Xrm.Sdk;
using System;

namespace CustomAPIs.ActualizarSeguimiento.Services
{
    public class SeguimientoService
    {
        private readonly IOrganizationService _service;

        public SeguimientoService(IOrganizationService service)
        {
            _service = service;
        }

        public Models.Response Procesar(Models.Request request)
        {
            if (string.IsNullOrEmpty(request.IdSeguimiento))
                return new Models.Response { Success = false, Message = "Id requerido" };

            var entity = new Entity("rs_actualizardatoscliente", Guid.Parse(request.IdSeguimiento));
            entity["statuscode"] = new OptionSetValue(1);

            _service.Update(entity);

            return new Models.Response
            {
                Success = true,
                Message = "Actualizado correctamente"
            };
        }
    }
}

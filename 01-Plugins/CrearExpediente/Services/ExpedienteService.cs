using System;
using System.Net.Http;
using System.Text;
using Newtonsoft.Json;
using Plugins.CrearExpediente.Models;
using Microsoft.Xrm.Sdk;

namespace Plugins.CrearExpediente.Clients
{
    public class ApiClient
    {
        private readonly ITracingService _tracing;

        public ApiClient(ITracingService tracing)
        {
            _tracing = tracing;
        }

        public ExpedienteResponse Enviar(ExpedienteRequest request)
        {
            try
            {
                var json = JsonConvert.SerializeObject(request);

                using (var client = new HttpClient())
                {
                    var content = new StringContent(json, Encoding.UTF8, "application/json");
                    var result = client.PostAsync("https://api.demo.com/expediente", content).Result;
                    var data = result.Content.ReadAsStringAsync().Result;

                    return JsonConvert.DeserializeObject<ExpedienteResponse>(data);
                }
            }
            catch (Exception ex)
            {
                return new ExpedienteResponse
                {
                    Success = false,
                    Message = ex.Message
                };
            }
        }
    }
}

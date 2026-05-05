export async function ejecutarSimulador(executionContext: Xrm.Events.EventContext) {
    const formContext = executionContext.getFormContext();

    const data = {
        cliente: formContext.getAttribute("customerid")?.getValue()?.[0]?.id,
        monto: formContext.getAttribute("estimatedvalue")?.getValue()
    };

    const response = await service.simular(data);

    if (response.success) {
        formContext.getAttribute("rs_resultado")?.setValue(response.resultado);
    }
}

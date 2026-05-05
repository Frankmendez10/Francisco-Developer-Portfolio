export function manejarTabs(executionContext: Xrm.Events.EventContext): void {
    const formContext = executionContext.getFormContext();
    const evento = formContext.getAttribute("rs_evento")?.getValue();

    const config: Record<number, string[]> = {
        59: ["tab_general", "tab_detalle"],
        60: ["tab_adicional"]
    };

    // Ocultar todos
    formContext.ui.tabs.forEach(tab => tab.setVisible(false));

    // Mostrar según evento
    if (evento && config[evento]) {
        config[evento].forEach(tabName => {
            formContext.ui.tabs.get(tabName)?.setVisible(true);
        });
    }
}

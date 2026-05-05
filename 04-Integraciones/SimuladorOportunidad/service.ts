export const service = {
    async simular(data: any) {
        const response = await fetch("https://api.demo.com/simulador", {
            method: "POST",
            body: JSON.stringify(data)
        });

        return await response.json();
    }
};

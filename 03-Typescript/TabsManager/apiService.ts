export async function consumirServicio(url: string, payload: any): Promise<any> {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        return await response.json();
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
}

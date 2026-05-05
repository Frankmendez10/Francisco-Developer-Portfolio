
# 🧩 Dynamics 365 Form Scripts (TypeScript)

## 🇪🇸 Descripción

Conjunto de scripts desarrollados en TypeScript para personalizar el comportamiento de formularios en Dynamics 365, incluyendo manejo dinámico de tabs y consumo de servicios externos.

## 🇺🇸 Description

Collection of TypeScript scripts designed to customize Dynamics 365 forms, including dynamic tab management and external API consumption.

---

## 🚀 Funcionalidades | Features

* Manejo dinámico de visibilidad de tabs
* Configuración basada en eventos
* Consumo de APIs REST
* Manejo de errores en llamadas asíncronas

---

## 🧠 Arquitectura | Architecture

* `tabsManager.ts` → Control de UI (tabs, visibilidad)
* `apiService.ts` → Comunicación con servicios externos

---

## ⚙️ Ejemplo de uso | Usage Example

* Evento OnLoad del formulario
* Evento OnChange de campos (ej. tipo de evento)

---

## 🚧 Retos | Challenges

* Manejo del contexto de formulario (`formContext`)
* Control dinámico de UI sin hardcode
* Manejo de promesas y errores async

---

## 🔮 Mejoras futuras | Future Improvements

* Centralizar configuración en JSON
* Reutilización entre múltiples formularios
* Logging de errores en backend

---

## ⚠️ Disclaimer

Este proyecto es una recreación con fines demostrativos.
This project is a recreation for demonstration purposes.

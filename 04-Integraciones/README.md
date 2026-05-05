
# 🚀 Opportunity Simulator Integration

## 🇪🇸 Descripción

Integración desarrollada en Dynamics 365 que permite simular escenarios de negocio a partir de una oportunidad, enviando datos a un servicio externo y almacenando la respuesta.

## 🇺🇸 Description

Integration built in Dynamics 365 that simulates business scenarios from an opportunity by sending data to an external API and storing the response.

---

## ⚙️ Funcionalidad | Functionality

* Obtiene datos de la oportunidad
* Construye un payload dinámico
* Consume un servicio REST
* Procesa la respuesta
* Actualiza campos en Dynamics 365

---

## 🔄 Flujo | Flow

1. Usuario ejecuta acción (botón)
2. Se obtienen datos del formulario
3. Se envía request a API externa
4. Se recibe respuesta
5. Se actualiza la oportunidad

---

## 🧠 Arquitectura | Architecture

* `simulador.ts` → Orquestación desde el formulario
* `service.ts` → Consumo de API externa

---

## 🚧 Retos | Challenges

* Manejo de datos relacionados (cliente, oportunidad)
* Construcción dinámica del payload
* Manejo de errores en integración

---

## ✅ Resultado | Result

Automatización de simulaciones, permitiendo toma de decisiones más rápida.

---

## 🔮 Mejoras futuras | Future Improvements

* Manejo de estados (loading, success, error)
* Retry automático en fallas
* Logging de respuestas

---

## ⚠️ Disclaimer

Este proyecto es una recreación basada en experiencia profesional.
This project is a recreation based on professional experience.

# Frontend

Frontend basado en React, Vite, JavaScript/JSX, HTML5 y CSS3.

## Estado

Existe un esqueleto ejecutable de React con estilos globales, tokens visuales
alineados con UI-001 y una prueba inicial de renderizado. Las pantallas y
funcionalidades de los módulos se incorporarán progresivamente.

## Arquitectura

- La interfaz consumirá exclusivamente la API definida en API-001.
- La comunicación HTTP se centralizará en `src/services/`.
- El frontend no accederá directamente a los archivos JSON.
- Las reglas de negocio y los cálculos financieros serán responsabilidad
  exclusiva del backend.
- La identidad visual y el inventario de componentes están definidos en
  UI-001.
- La organización de módulos seguirá ARCH-001.

## Desarrollo local

Desde esta carpeta:

```powershell
npm ci
npm run dev
```

Validaciones:

```powershell
npm test
npm run build
```

La URL de la API local se configura mediante `.env`, tomando
`.env.example` como referencia. No se deben almacenar secretos en variables
expuestas al navegador con prefijo `VITE_`.

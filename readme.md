Proyecto [Nombre del Proyecto]
Este es un proyecto desarrollado con [Next.js / Typescript / Stack T3 App]. A continuación se detallan los pasos para ponerlo en marcha.

🛠️ Requisitos
Node.js instalado

Acceso a la terminal

Editor de código (VSCode recomendado)

⚙️ Pasos de instalación
Instala NPM (si no lo tienes):


npm install -g npm
Instala PNPM:
npm install -g pnpm

Instala las dependencias del proyecto:
pnpm install

Genera el cliente de Prisma:
pnpm prisma generate


Crea el archivo .env en la raíz del proyecto
Copia y pega tus variables de entorno dentro de ese archivo, por ejemplo:

DATABASE_URL=tu_url_de_base_de_datos
NEXTAUTH_SECRET=tu_secreto


Inicia el proyecto en modo desarrollo:
pnpm dev

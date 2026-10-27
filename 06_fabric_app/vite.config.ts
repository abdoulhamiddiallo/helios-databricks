// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type PluginOption } from "vite";
import license from "rollup-plugin-license";

import { resolve } from 'path';

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Uniquement en développement : rend le serveur Vite local compatible avec les navigateurs
// qui contrôlent l'accès au réseau local (LNA) quand le portail Fabric affiche
// http://localhost dans un iframe. Ajoute l'en-tête d'autorisation sur chaque réponse
// et répond directement à la requête OPTIONS de contrôle préalable.
const localNetworkAccessPlugin: PluginOption = {
  name: 'local-network-access-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      if (req.method === 'OPTIONS' && req.headers['access-control-request-private-network']) {
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || '*');
        res.statusCode = 204;
        res.end();
        return;
      }
      next();
    });
  },
};

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        localNetworkAccessPlugin,
    ],
    resolve: {
        alias: {
            '@': resolve(projectRoot, 'src'),
        }
    },
    optimizeDeps: {
        include: ['@microsoft/fabric-visuals', '@microsoft/fabric-datagrid', '@microsoft/fabric-visuals-core'],
    },
    build: {
        commonjsOptions: {
            include: [/node_modules/],
        },
        rollupOptions: {
            plugins: [
                license({
                    thirdParty: {
                        multipleVersions: true,
                        output: {
                            file: resolve(projectRoot, 'dist', 'THIRD_PARTY_NOTICES.txt'),
                            template(dependencies) {
                                if (dependencies.length === 0) {
                                    return 'Aucune dépendance tierce.';
                                }
                                return (
                                    'Fichier généré automatiquement à la compilation.\n\n' +
                                    dependencies
                                        .map((dep) => {
                                            const lines = [
                                                `${dep.name}@${dep.version}`,
                                                `License: ${dep.license || 'UNKNOWN'}`,
                                            ];
                                            if (dep.author) {
                                                lines.push(`Author: ${typeof dep.author === 'string' ? dep.author : dep.author.text()}`);
                                            }
                                            if (dep.noticeText) {
                                                lines.push('', 'NOTICE:', dep.noticeText.trim());
                                            }
                                            if (dep.licenseText) {
                                                lines.push('', dep.licenseText.trim());
                                            }
                                            return lines.join('\n');
                                        })
                                        .join('\n\n' + '='.repeat(60) + '\n\n')
                                );
                            },
                        },
                    },
                }),
            ],
        },
    },
});

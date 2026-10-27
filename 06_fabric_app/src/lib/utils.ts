// Copyright (c) Microsoft Corporation. Licence MIT.
// Fichier issu du modèle Fabric Apps, adapté et commenté pour HÉLIOS.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fusionne des classes Tailwind en résolvant les conflits.
 *
 *   cn("px-2 py-1", actif && "bg-primary text-primary-foreground")
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

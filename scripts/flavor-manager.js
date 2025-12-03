/**
 * Your Flavor - Flavor Manager
 * Handles loading, saving, and retrieving user configurations
 * @module your-flavor/flavor-manager
 */

import { MODULE_ID, MODULE_NAME, DEFAULT_CONFIG } from './constants.js';

/**
 * Manages flavor configurations for all users
 */
export class FlavorManager {
    constructor() {
        // No cache needed - we always read fresh from user flags
        // Foundry syncs flags automatically across all clients
    }

    /**
     * Initialize the manager
     */
    async initialize() {
        console.log(`${MODULE_NAME} | FlavorManager initialized`);
    }

    /**
     * Get configuration for a specific user
     * @param {string} userId - The user ID
     * @returns {Object|null} The user's flavor configuration
     */
    getConfig(userId) {
        // Always get fresh from flags to ensure we have the latest config
        // User flags are synced by Foundry across all clients
        const user = userId === game.user?.id ? game.user : game.users.get(userId);

        if (user) {
            const config = user.getFlag(MODULE_ID, 'config');
            if (config) {
                return config;
            }
        }

        return null;
    }

    /**
     * Get current user's configuration
     * @returns {Object} The current user's configuration (or default)
     */
    getCurrentConfig() {
        const config = this.getConfig(game.user.id);
        return config || { ...DEFAULT_CONFIG };
    }

    /**
     * Save configuration for the current user
     * @param {Object} config - The configuration to save
     */
    async saveConfig(config) {
        // Validate config
        const validConfig = this._validateConfig(config);

        // Clear existing flag first to ensure clean update
        await game.user.unsetFlag(MODULE_ID, 'config');

        // Save to user flags (syncs to server and other clients automatically)
        await game.user.setFlag(MODULE_ID, 'config', validConfig);

        console.log(`${MODULE_NAME} | Configuration saved`, validConfig);
    }

    /**
     * Update specific configuration fields
     * @param {Object} updates - Partial configuration updates
     */
    async updateConfig(updates) {
        const current = this.getCurrentConfig();
        const newConfig = foundry.utils.mergeObject(current, updates);
        await this.saveConfig(newConfig);
    }

    /**
     * Reset current user's configuration to defaults
     */
    async resetConfig() {
        await this.saveConfig({ ...DEFAULT_CONFIG });
    }

    /**
     * Check if current user has a configuration
     * @returns {boolean}
     */
    hasConfig() {
        return !!game.user.getFlag(MODULE_ID, 'config');
    }

    /**
     * Validate and sanitize configuration
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validated configuration
     * @private
     */
    _validateConfig(config) {
        const validated = foundry.utils.mergeObject({ ...DEFAULT_CONFIG }, config);

        // Ensure boolean values
        validated.enabled = Boolean(validated.enabled);

        // Sanitize customizations
        if (validated.customizations) {
            const c = validated.customizations;

            // Clamp numeric values
            c.fontSize = Math.max(8, Math.min(32, c.fontSize || 14));
            c.borderWidth = Math.max(0, Math.min(10, c.borderWidth || 2));
            c.borderRadius = Math.max(0, Math.min(30, c.borderRadius || 8));
            c.padding = Math.max(0, Math.min(30, c.padding || 12));
            c.glowIntensity = Math.max(0, Math.min(30, c.glowIntensity || 10));

            // Ensure boolean values
            c.glowEnabled = Boolean(c.glowEnabled);
            c.shadowEnabled = Boolean(c.shadowEnabled);

            // Validate border style
            const validBorderStyles = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge'];
            if (!validBorderStyles.includes(c.borderStyle)) {
                c.borderStyle = 'solid';
            }
        }

        // Sanitize custom HTML if present (basic XSS prevention)
        if (validated.customHtml) {
            // Only allow if GM has enabled it
            if (!game.settings.get(MODULE_ID, 'allowCustomHtml') && !game.user.isGM) {
                validated.customHtml = null;
            }
        }

        return validated;
    }

    /**
     * Export configuration as JSON
     * @returns {string} JSON string of configuration
     */
    exportConfig() {
        const config = this.getCurrentConfig();
        return JSON.stringify(config, null, 2);
    }

    /**
     * Import configuration from JSON
     * @param {string} jsonString - JSON string to import
     */
    async importConfig(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            await this.saveConfig(config);
            return true;
        } catch (error) {
            console.error(`${MODULE_NAME} | Failed to import configuration:`, error);
            return false;
        }
    }
}

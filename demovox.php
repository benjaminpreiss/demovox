<?php

namespace Demovox;

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              https://github.com/spschweiz/demovox
 * @since             1.0.0
 * @package           Demovox
 *
 * @wordpress-plugin
 * Plugin Name:       demovox
 * Plugin URI:        https://demovox.ch/
 * Description:       This is a short description of what the plugin does. It's displayed in the WordPress admin area.
 * Version:           1.0.0
 * Author:            Fabian Horlacher / SP Schweiz
 * Author URI:        https://www.spschweiz.ch/
 * GitHub Plugin URI: https://github.com/spschweiz/demovox
 * License:           GPLv3
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.en.html
 * Text Domain:       demovox
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
	die('No direct access');
}

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */
define('DEMOVOX_VERSION', '1.0.0');

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/wp/Activator.php
 */
function activateDemovox()
{
	require_once plugin_dir_path(__FILE__) . 'includes/wp/Activator.php';
	Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/wp/Deactivator.php
 */
function deactivateDemovox()
{
	require_once plugin_dir_path(__FILE__) . 'includes/wp/Deactivator.php';
	Deactivator::deactivate();
}

/**
 * The code that runs during plugin uninstall.
 * This action is documented in includes/wp/Deactivator.php
 */
function uninstallDemovox()
{
	require_once plugin_dir_path(__FILE__) . 'includes/wp/Uninstaller.php';
	Uninstaller::uninstall();
}

register_activation_hook(__FILE__, '\Demovox\activateDemovox');
register_deactivation_hook(__FILE__, '\Demovox\deactivateDemovox');
register_uninstall_hook(__FILE__, '\Demovox\uninstallDemovox');

/** §1
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path(__FILE__) . 'includes/Core.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function runDemovox()
{

	$plugin = new Core();
	$plugin->run();
}

runDemovox();
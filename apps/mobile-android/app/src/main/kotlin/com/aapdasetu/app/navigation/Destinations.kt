package com.aapdasetu.app.navigation

/** Route constants for the nav graph. Matches the flow confirmed by the
 *  Stitch reference prototype (aapdasetu_mesh_protocol/code.html):
 *  Welcome -> Setup -> Mesh, with Mesh/Map/Alerts/Profile as bottom-nav peers. */
object Destinations {
    const val WELCOME = "welcome"
    const val SETUP = "setup"
    const val ALERTS = "alerts"
    const val MAP = "map"
    const val MESH = "mesh"
    const val PROFILE = "profile"
}

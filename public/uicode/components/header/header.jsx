import React from "react";

export default class HeaderBar extends React.Component {
  constructor() {
    super();
    this.state = {
      tokenCount: 0,
    };
    let pathName = window.location.pathname;
    this.homeHref = (pathName === "/") ? false : `/`;
    this.embeddingHref = (pathName === "/embedding/") ? false : `/embedding/`;
    this.helpHref = (pathName === "/media/") ? false : `/media/`;
    this.homeActive = this.homeHref ? "" : " active";
    this.embedActive = this.embeddingHref ? "" : " active";
    this.helpActive = this.helpHref ? "" : " active";
   }
  render() {
    return (<nav class="navbar navbar-light navbar_wrapper">
      <ul class="navbar-nav container-fluid d-flex flex-row justify-content-end justify-content-sm-between container"
        style={{ padding: "0" }}>
        <li class="" style={{ marginLeft: "20px", width: "120px" }}>
          <a class="navbar_brand hover_yellow" style={{ textDecoration: "none" }} href="/">
            <span class="navbar_logo" style={{ backgroundImage: "url('/images/logo64.png')", top: "2px;" }}></span>
            <div class=" scroll_to_top_icon">
              <span class="material-icons-outlined">
                arrow_upward
              </span>
            </div>
          </a>
        </li>
        <li style={{ background: "none", flex: "1" }} class="app_panel">
          <ul class="header_tabs nav" role="tablist">
            <li class="nav-item" role="presentation">
              <a className={"nav-link" + this.homeActive} href={this.homeHref} role="tab">
                <span class="tab_label">Prompt</span>
              </a>
            </li>
            <li class="nav-item" role="presentation">
              <a className={"nav-link"  + this.embedActive}  href={this.embeddingHref} role="tab">
                <span class="tab_label">Embed</span>
              </a>
            </li>
            <li class="nav-item" role="presentation">
              <a className={"nav-link" + this.helpActive}  href={this.helpHref} role="tab">
                <span class="tab_label">Learn</span>
              </a>
            </li>
          </ul >
        </li >
        <li class="nav-item" style={{ width: "70px" }}>
          <a class="nav-link show_profile_modal profile_menu_anchor hover_yellow" href="profile">
            <span class="menu_profile_user_image_span member_profile_image hover_yellow"> </span>
          </a>
        </li>
        <li class="nav-item mobile_hide signed_out_list_item" style={{ width: 0, overflow: "visible" }}>
          <button class="signin_cta_navbar hover_yellow btn btn-primary" type="button"><span
            class="mobile_hide">Login</span><span class="mobile_show"><i class="material-icons"
              style={{ position: "relative", top: "3px" }}>login</i></span>
          </button>
        </li>
        <li style={{ background: "none", width: "70px" }} class="app_panel">
          <a class="account_status_display" href="showaccountinfo">
            <div class="credits_left"></div>
          </a>
        </li>
      </ul >
    </nav >);
  }
}
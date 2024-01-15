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
        <li className="navbar_logo_li">
          <a class="navbar_brand" style={{ textDecoration: "none" }}>
            <span class="navbar_logo" style={{ backgroundImage: "url('/images/logo64.png')", top: "2px;" }}></span>
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
        <li class="nav-item navbar_profile_li signed_in_list_item" style={{ width: "70px" }}>
          <a class="nav-link show_profile_modal profile_menu_anchor hover_yellow" href="profile">
            <span class="menu_profile_user_image_span member_profile_image hover_yellow"> </span>
          </a>
        </li>
        <li class="nav-item nav_signin_li signed_out_list_item">
          <button class="signin_cta_navbar hover_yellow btn btn-primary" type="button">Login
          </button>
        </li>
        <li class="navbar_statusinfo_li signed_in_list_item">
          <a class="account_status_display" href="showaccountinfo">
            <div class="credits_left"></div>
          </a>
        </li>
        <li class="nav-item nav_signin_li loading_li_spacer"></li>
      </ul >
    </nav >);
  }
}
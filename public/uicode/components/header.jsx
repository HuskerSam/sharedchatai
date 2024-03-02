import React from "react";

export default class HeaderBar extends React.Component {
  constructor() {
    super();
    this.state = {
      tokenCount: 0,
    };
    let pathName = window.location.pathname;
    this.app = window.AppInstance;

    this.homeHref = (pathName === "/") ? "" : `/`;
    this.embeddingHref = (pathName === "/embedding/") ? "" : `/embedding/`;
    this.helpHref = (pathName === "/about/") ? "" : `/about/`;
    this.homeActive = this.homeHref ? "" : " active";
    this.embedActive = this.embeddingHref ? "" : " active";
    this.helpActive = this.helpHref ? "" : " active";
  }
  render() {
    return (<nav className="navbar navbar-light navbar_wrapper">
      <ul className="navbar-nav container-fluid d-flex flex-row justify-content-end justify-content-sm-between container"
        style={{ padding: "0", minHeight: "65px" }}>
        <li className="navbar_logo_li">
          <a className="navbar_brand" style={{ textDecoration: "none" }}>
            <span className="navbar_logo"></span>
          </a>
        </li>
        <li style={{ background: "none", flex: "1" }} className="app_panel">
          <ul className="header_tabs nav" role="tablist">
            <li className="nav-item" role="presentation">
              <a className={"nav-link" + this.homeActive} href={this.homeHref} role="tab">
                <span className="tab_label">Prompt</span>
              </a>
            </li>
            <li className="nav-item" role="presentation">
              <a className={"nav-link" + this.embedActive} href={this.embeddingHref} role="tab">
                <span className="tab_label">Augment</span>
              </a>
            </li>
            <li className="nav-item" role="presentation">
              <a className={"nav-link" + this.helpActive} href={this.helpHref} role="tab">
                <span className="tab_label">About</span>
              </a>
            </li>
          </ul >
        </li >
        <li className="nav-item navbar_profile_li signed_in_list_item" style={{ width: "70px" }}>
          <a onClick={(e) => {
            e.preventDefault();
            this.app.profileHelper.show();
          }} className="nav-link show_profile_modal profile_menu_anchor hover_yellow" href="profile">
            <span className="menu_profile_user_image_span member_profile_image hover_yellow"> </span>
          </a>
        </li>
        <li className="nav-item nav_signin_li signed_out_list_item">
          <button onClick={() =>
            this.app.login.show()} className="signin_cta_navbar hover_yellow btn btn-primary" type="button">Login
          </button>
        </li>
        <li className="navbar_statusinfo_li signed_in_list_item">
          <a onClick={(e)=>  {
            e.preventDefault();
            this.app.profileHelper.show(true);
          }} className="account_status_display" href="showaccountinfo">
            <div className="credits_left"></div>
          </a>
        </li>
        <li className="nav-item nav_signin_li loading_li_spacer"></li>
      </ul >
    </nav >);
  }
}
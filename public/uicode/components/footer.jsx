import React from "react";

export default class FooterBar extends React.Component {
    constructor() {
        super();
        this.state = {
            tokenCount: 0,
        };
    }
    render() {
        return (<div className="container">
            <footer className="app_panel">
                <div style={{ flex: "1" }}>
                    <h3 style={{display: "inline-block"}}><span>Una<span className="home_navbar_name_color">cog</span></span></h3>
                    <div style={{ fontSize: "1.15em", padding: "8px", display: "inline-block", margin: "8px" }}>
                        <a href="mailto:support@unacog.com" target="_blank">
                                support@unacog.com</a>
                    </div>
                    <div style={{ textAlign: "center", lineHeight: "3em", paddingBottom: "12px" }}>
                        <div style={{ whiteSpace: "nowrap", display: "inline-block" }}>
                            &nbsp;
                            &nbsp;
                            <a href="/help/">Help</a>
                            &nbsp;
                            &nbsp;
                            <a href="/content/privacy/" className="">Privacy</a>
                            &nbsp;
                            &nbsp;
                            <a className="" href="/about/#pricing">Pricing</a>
                            &nbsp;
                            &nbsp;
                        </div>
                        <div style={{display: "inline-block", whiteSpace: "nowrap" }}>© 2024, All Rights Reserved</div>
                    </div>
                </div>
            </footer >
        </div >);
    }
}
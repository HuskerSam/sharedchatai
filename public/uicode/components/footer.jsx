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
                    <h2 style={{display: "inline-block"}}><span>Una<span className="home_navbar_name_color">cog</span></span></h2>
                    <div style={{ fontSize: "1.5em", padding: "12px", display: "inline-block", margin: "12px" }}>
                        <a href="/help/">Reference</a>
                        &nbsp;
                        &nbsp;
                        <a href="/about/">About</a>
                    </div>
                    <div style={{ textAlign: "center", lineHeight: "3em", paddingBottom: "12px" }}>
                        <div style={{ whiteSpace: "nowrap", display: "inline-block" }}>
                            &nbsp;
                            &nbsp;
                            <a href="mailto:support@unacog.com" target="_blank">
                                support@unacog.com</a>
                            &nbsp;
                            &nbsp;
                            <a href="/content/privacy/" className="">Privacy</a>
                            &nbsp;
                            &nbsp;
                            <a className="" href="/about/#pricing">Pricing</a>
                            &nbsp;
                            &nbsp;
                        </div>
                        <div style={{display: "inline-block", whiteSpace: "nowrap" }}>© 2023, All Rights Reserved</div>
                    </div>
                </div>
            </footer >
        </div >);
    }
}
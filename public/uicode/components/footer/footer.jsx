import React from "react";

export default class FooterBar extends React.Component {
    constructor() {
        super();
        this.state = {
            tokenCount: 0,
        };
    }
    render() {
        return (<div class="container">
            <footer class="app_panel">
                <hr />
                <div style={{ flex: "1" }}>
                    <h2><span>Una<span class="home_navbar_name_color">cog</span></span></h2>
                    <a href=" mailto:support@unacog.com"
                        target="_blank">
                        support@unacog.com</a>
                    &nbsp;
                    <a href="/content/about/" class="">About</a>
                    &nbsp;
                    <a href="/content/privacy/" class="">Privacy</a>
                    &nbsp;
                    <a class="" href="/content/pricing/">Pricing</a>
                </div>
                <div class="d-flex flex-column flex-sm-row justify-content-center py-2">
                    <p class="my-1"> © 2023, All Rights Reserved</p>
                </div>
            </footer >
        </div >);
    }
}
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
            <footer class="app_panel main_block">
                <div class="row">
                    <div class="mb-3 mb-md-0 text-center text-md-start" style={{ flex: "1" }}>
                        <h5><span>Una<span class="home_navbar_name_color">cog</span></span></h5>
                        <p>
                            We are a dedicated team based in Lincoln, Nebraska, USA. Please reach out
                            at <a href=" mailto:support@unacog.com"
                                target="_blank">
                                support@unacog.com</a> for any questions, feedback, or partnership inquiry.
                        </p>
                    </div>
                    <div class="col-md-2 mb-md-0">
                        <h5>Company</h5>
                        <a href="/content/about/" class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25
                                    link-underline-opacity-100-hover">About</a>
                        <br />
                        <a href="/content/privacy/" class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25
                                    link-underline-opacity-100-hover">Privacy</a>
                        <br />
                        <a class="p-1 nav-link link-secondary link-offset-2 link-underline-opacity-25
                                    link-underline-opacity-100-hover" href="/content/pricing/">Pricing</a>
                    </div>
                    <div class="col-md-4 mb-3">

                    </div>
                </div>
                <div class="d-flex flex-column flex-sm-row justify-content-center py-2 border-top">
                    <p class="my-1"> © 2023, All Rights Reserved</p>
                </div>
            </footer >
        </div >);
    }
}
import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import FormControl from 'react-bootstrap/FormControl';
import {
    getAuth,
} from "firebase/auth";
import {
    encode,
  } from "gpt-tokenizer";

export default function DialogParseURL(props) {
    const [show, setShow] = React.useState(false);
    const [parseURL, setParseURL] = React.useState("");
    const [parseOptions, setParseOptions] = React.useState("");
    const [parseResult, setParseResult] = React.useState("");
    const [parseStatus, setParseStatus] = React.useState("");
    const [basePath, setBasePath] = React.useState("");

    props.hooks.setShow = setShow;
    props.hooks.setParseURL = setParseURL;
    props.hooks.setParseOptions = setParseOptions;
    props.hooks.setBasePath = setBasePath;

    const handleClose = () => setShow(false);

    /** */
    const scrapeSingleURL = async () => {
        const url = parseURL;
        const options = parseOptions;
        setParseStatus("");
        setParseResult("");
        if (!url) {
            alert("URL required");
            return;
        }

        const body = {
            url,
            options,
        };
        const token = await getAuth().currentUser?.getIdToken();
        const fResult = await fetch(basePath + "embeddingApi/scrapeurl", {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        });
        const result = await fResult.json();
        console.log(result);
        if (!result.success) {
            setParseResult(JSON.stringify(result, null, "\t"));
        } else {
            const text = result.text;
            setParseResult(text);
            let statusResult = `Parsed Text Results (${text.length} chars, `;
            if (result.duration) {
                const credits = result.encodingCredits;
                statusResult += `${Math.ceil(result.duration)} seconds, ${credits} credits)`;
            } else {
                const tokens = encode(text);
                statusResult += `${tokens.length} tokens)`;
            }
            setParseStatus(statusResult);
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>Parse URL</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <h4>Enter URL (html, pdf or mp3) to parse</h4>
                <label style={{ paddingTop: "6px" }}>URL</label>
                &nbsp;
                <FormControl as="input" defaultValue={parseURL}
                                            onChange={(e) => setParseURL(e.target.value)}></FormControl>
                <br />
                <label style={{ paddingTop: "6px" }}>Options</label>
                &nbsp;
                <input type="text" class="parse_url_path_options form-control" value={parseOptions} />
                &nbsp;
                <button class="parse_url_parse_button btn btn-primary" onClick={scrapeSingleURL}>Parse</button>
                <br />
                <h4>Parsed Text Results</h4>
                <div>
                    { parseStatus }
                </div>
                <FormControl as="textarea" value={parseResult}>
                </FormControl>
            </Modal.Body>
            <Modal.Footer className="theme_panel">
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
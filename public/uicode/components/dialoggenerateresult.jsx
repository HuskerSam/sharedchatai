import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function DialogGenerateResult(props) {
    const [show, setShow] = React.useState(false);
    const [path, setPath] = React.useState("");
    const [perDocPath, setPerDocPath] = React.useState("");
    const [title, setTitle] = React.useState("");

    props.hooks.setShow = setShow;
    props.hooks.setPath = setPath;
    props.hooks.setPerDocPath = setPerDocPath;
    props.hooks.setTitle = setTitle;

    const handleClose = () => setShow(false);

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <h2>Full Map</h2>
                <a href={path} target="_blank" style={{ width: "100%", overflow: "hidden", wordBreak: "break-all", 
                    display: "block" }}>
                    {path}
                </a>
                <br />
                <h2>Map per document</h2>
                <a href={perDocPath} target="_blank" style={{ width: "100%", overflow: "hidden", wordBreak: "break-all", 
                    display: "block" }}>
                    {perDocPath}
                </a>
            </Modal.Body>
            <Modal.Footer className="theme_panel">
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
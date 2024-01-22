import React from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function DialogGenerateResult(props) {
    const [show, setShow] = React.useState(false);
    const [path, setPath] = React.useState("");
    const [title, setTitle] = React.useState("");

    props.hooks.setShow = setShow;
    props.hooks.setPath = setPath;
    props.hooks.setTitle = setTitle;

    const handleClose = () => setShow(false);

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton className="theme_panel">
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="theme_panel">
                <a href={path} target="_blank" style={{ width: "100%", overflow: "hidden", whiteSpace: "nowrap", 
                    display: "block" }}>
                    {path}
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
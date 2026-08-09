"use client";

import sendErr from "@/actions/errActions";


export default function Err({ error, retry }: { error: Error, retry: () => void }) {
   sendErr({
    ...error,
    stack: error.stack,
    cause: error.cause
});

    return (
        <div className="w-screen h-screen center-flex flex-col">
            <h1 className="text-2xl mb-3">Sorry! An Error Caused</h1>
            <h2 className="mb-5">
                We are caught with an Internal Server, Your problem will soon being fixed. <br />
                If not fixed, Connect with us at <a href="mailto:great.sanatan.ai@gmail.com">Our Email: great.sanatan.ai@gmail.com</a>
                </h2>
            <button className="btn-gradient" onClick={retry} >Try Reloading Page</button>
        </div>
    )
}
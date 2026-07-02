// Hide AE2 cable facades from the EMI item browser. This is an EMI-only
// surface; JEI visibility remains unchanged.
if (Platform.isLoaded('emi') && typeof EMIEvents !== 'undefined') {
    EMIEvents.hideItems(function (event) {
        event.hide('ae2:facade')
    })
}

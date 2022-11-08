<div class="modal-footer">
  <slot />
</div>

<style>
  .modal-footer {
    align-items: center;
    background-color: var(--st-gray-10);
    border-radius: 0px 0px 4px 4px;
    border-top: 1px solid var(--st-gray-15);
    color: var(--st-gray-100);
    display: flex;
    height: 40px;
    justify-content: flex-end;
    padding: 8px;
    width: 100%;
  }

  .modal-footer > :global(.st-button) {
    margin-left: 8px;
  }
</style>
